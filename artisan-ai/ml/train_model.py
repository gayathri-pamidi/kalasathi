import os
import json
from datetime import datetime
import pandas as pd
import numpy as np
import joblib

from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score

from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor

try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

def train_and_evaluate_pricing_model():
    # 1. Locate and load CSV
    base_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(base_dir, 'datasets', 'sih2.csv')
    if not os.path.exists(csv_path):
        csv_path = r'C:\ARTISAN AI\Artisan ai project\artisan-ai\ml\datasets\sih2.csv'

    print(f"[ML Pipeline] Loading dataset from: {csv_path}")
    df = pd.read_csv(csv_path)
    
    # 2. Date parsing and feature engineering
    df['parsed_date'] = pd.to_datetime(df['date'], format='mixed', errors='coerce')
    df['year'] = df['parsed_date'].dt.year
    df['month'] = df['parsed_date'].dt.month
    df['day'] = df['parsed_date'].dt.day
    df['day_of_week'] = df['parsed_date'].dt.dayofweek

    # Sort chronologically for temporal splitting
    df = df.sort_values(by='parsed_date').reset_index(drop=True)

    # Define Feature Configurations (Excluding high-cardinality 'product' and 'district' for peak test generalization)
    num_features = ['labour_hours', 'material_cost', 'product_cost', 'quantity', 'year', 'month', 'day', 'day_of_week']
    cat_features = ['state', 'category', 'sector', 'material', 'product_size', 'demand_level', 'season', 'source']
    excluded_features = ['product', 'district']
    target_col = 'market_price'

    all_feature_cols = num_features + cat_features

    print("\n--- Feature Cardinality & Audit Decisions ---")
    print(f"Total Rows: {len(df)}")
    print(f"Excluded Features: {excluded_features} to maximize future generalization and prevent sparse matrix overfitting.")

    # 3. Strict Chronological Date Split (All records of boundary date 2026-05-01 placed in Train set)
    boundary_date = pd.to_datetime('2026-05-01')
    
    train_mask = df['parsed_date'] <= boundary_date
    test_mask = df['parsed_date'] > boundary_date

    train_df = df[train_mask].reset_index(drop=True)
    test_df = df[test_mask].reset_index(drop=True)

    X_train = train_df[all_feature_cols]
    y_train = train_df[target_col]
    X_test = test_df[all_feature_cols]
    y_test = test_df[target_col]

    print(f"\n--- Strict Temporal Split ---")
    print(f"Train set: {len(X_train)} rows | Date Range: {train_df['parsed_date'].min().strftime('%Y-%m-%d')} to {train_df['parsed_date'].max().strftime('%Y-%m-%d')}")
    print(f"Test set:  {len(X_test)} rows | Date Range: {test_df['parsed_date'].min().strftime('%Y-%m-%d')} to {test_df['parsed_date'].max().strftime('%Y-%m-%d')}")

    # 4. Preprocessing Pipeline
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), num_features),
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), cat_features)
        ]
    )

    # 5. Candidate Models
    models = {
        'Linear Regression': LinearRegression(),
        'Random Forest': RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42),
        'Gradient Boosting': GradientBoostingRegressor(n_estimators=100, learning_rate=0.1, max_depth=5, random_state=42)
    }

    if HAS_XGBOOST:
        models['XGBoost Regressor'] = xgb.XGBRegressor(n_estimators=100, learning_rate=0.1, max_depth=5, random_state=42, verbosity=0)

    # 6. Model Training & Evaluation
    print("\n" + "="*85)
    print(f"{'Model Name':<20} | {'Train MAE':<10} | {'Test MAE':<10} | {'Test RMSE':<10} | {'Train R2':<10} | {'Test R2':<10}")
    print("="*85)

    results = {}
    best_model_name = None
    best_test_mae = float('inf')
    best_pipeline = None

    for name, model in models.items():
        pipeline = Pipeline(steps=[
            ('preprocessor', preprocessor),
            ('regressor', model)
        ])

        pipeline.fit(X_train, y_train)

        # Predictions
        train_preds = pipeline.predict(X_train)
        test_preds = pipeline.predict(X_test)

        # Ensure no negative price predictions
        train_preds = np.clip(train_preds, a_min=0, a_max=None)
        test_preds = np.clip(test_preds, a_min=0, a_max=None)

        # Metrics
        train_mae = mean_absolute_error(y_train, train_preds)
        test_mae = mean_absolute_error(y_test, test_preds)
        test_rmse = root_mean_squared_error(y_test, test_preds)
        train_r2 = r2_score(y_train, train_preds)
        test_r2 = r2_score(y_test, test_preds)

        results[name] = {
            'train_mae': float(train_mae),
            'test_mae': float(test_mae),
            'test_rmse': float(test_rmse),
            'train_r2': float(train_r2),
            'test_r2': float(test_r2),
            'mean_actual': float(y_test.mean()),
            'mean_predicted': float(test_preds.mean()),
            'pipeline': pipeline
        }

        print(f"{name:<20} | Rs.{train_mae:<8.2f} | Rs.{test_mae:<8.2f} | Rs.{test_rmse:<8.2f} | {train_r2:<10.4f} | {test_r2:<10.4f}")

        # Evaluate each model
        if name == 'XGBoost Regressor':
            xgboost_pipeline = pipeline

    # Enforce XGBoost Regressor as the final selected model per requirement
    final_model_name = 'XGBoost Regressor'
    final_pipeline = results[final_model_name]['pipeline']

    print("="*85)
    print(f"\n[FINAL SELECTED MODEL]: {final_model_name}")
    print(f"Test MAE: Rs. {results[final_model_name]['test_mae']:.2f}")
    print(f"Test RMSE: Rs. {results[final_model_name]['test_rmse']:.2f}")
    print(f"Test R2: {results[final_model_name]['test_r2']:.4f}")
    print(f"Mean Actual Price: Rs. {results[final_model_name]['mean_actual']:.2f}")
    print(f"Mean Predicted Price: Rs. {results[final_model_name]['mean_predicted']:.2f}")

    # 7. Save Final Pipeline & Metadata
    models_dir = os.path.join(base_dir, 'models')
    os.makedirs(models_dir, exist_ok=True)

    joblib_path = os.path.join(models_dir, 'price_prediction_model.joblib')
    joblib.dump(final_pipeline, joblib_path)
    print(f"\n[Artifact Saved] Trained pipeline saved to: {joblib_path}")

    metadata = {
        'final_model': final_model_name,
        'model_name': final_model_name,
        'target_column': target_col,
        'numerical_features': num_features,
        'categorical_features': cat_features,
        'excluded_features': excluded_features,
        'preprocessing_details': "StandardScaler for numerical features, OneHotEncoder(handle_unknown='ignore') for categorical features",
        'training_rows': len(X_train),
        'testing_rows': len(X_test),
        'training_date_range': f"{train_df['parsed_date'].min().strftime('%Y-%m-%d')} to {train_df['parsed_date'].max().strftime('%Y-%m-%d')}",
        'testing_date_range': f"{test_df['parsed_date'].min().strftime('%Y-%m-%d')} to {test_df['parsed_date'].max().strftime('%Y-%m-%d')}",
        'test_mae': results[final_model_name]['test_mae'],
        'test_rmse': results[final_model_name]['test_rmse'],
        'test_r2': results[final_model_name]['test_r2'],
        'train_r2': results[final_model_name]['train_r2'],
        'training_timestamp': datetime.now().isoformat(),
        'all_models_evaluated': {k: {m: v[m] for m in ['train_mae', 'test_mae', 'test_rmse', 'train_r2', 'test_r2']} for k, v in results.items()}
    }

    metadata_path = os.path.join(models_dir, 'model_metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"[Artifact Saved] Metadata saved to: {metadata_path}")

    return results, final_model_name

if __name__ == '__main__':
    train_and_evaluate_pricing_model()
