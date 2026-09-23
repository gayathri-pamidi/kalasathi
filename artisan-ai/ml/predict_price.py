import os
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime

_MODEL_PIPELINE = None
_MODEL_METADATA = None

def load_pricing_model():
    global _MODEL_PIPELINE, _MODEL_METADATA
    if _MODEL_PIPELINE is not None:
        return _MODEL_PIPELINE, _MODEL_METADATA

    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_dir, 'models', 'price_prediction_model.joblib')
    metadata_path = os.path.join(base_dir, 'models', 'model_metadata.json')

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Trained price prediction model not found at {model_path}. Please run train_model.py first.")

    _MODEL_PIPELINE = joblib.load(model_path)

    if os.path.exists(metadata_path):
        with open(metadata_path, 'r') as f:
            _MODEL_METADATA = json.load(f)

    return _MODEL_PIPELINE, _MODEL_METADATA

def predict_price(input_data):
    """
    Accepts a single dict or list of dicts/DataFrame representing craft product details.
    Returns predicted market price (float >= 0) or list of predictions.
    """
    pipeline, _ = load_pricing_model()

    # Normalize input to pandas DataFrame
    if isinstance(input_data, dict):
        df_input = pd.DataFrame([input_data])
        is_single = True
    elif isinstance(input_data, list):
        df_input = pd.DataFrame(input_data)
        is_single = False
    elif isinstance(input_data, pd.DataFrame):
        df_input = input_data.copy()
        is_single = False
    else:
        raise ValueError("Input data must be a dictionary, list of dictionaries, or pandas DataFrame.")

    # Validation & Fallback Defaults
    required_defaults = {
        'labour_hours': 8.0,
        'material_cost': 150.0,
        'quantity': 1,
        'state': 'Andhra Pradesh',
        'district': 'Chittoor',
        'category': 'Handicraft',
        'sector': 'Handicraft',
        'material': 'Wood',
        'product_size': 'Medium',
        'demand_level': 'Medium',
        'season': 'Winter',
        'source': 'Artisan Survey'
    }

    for col, default_val in required_defaults.items():
        if col not in df_input.columns:
            df_input[col] = default_val

    # Calculated product_cost fallback if missing
    if 'product_cost' not in df_input.columns or df_input['product_cost'].isnull().any():
        # product_cost ~ material_cost + labour_hours * 60
        calc_cost = df_input['material_cost'].astype(float) + (df_input['labour_hours'].astype(float) * 60.0)
        if 'product_cost' not in df_input.columns:
            df_input['product_cost'] = calc_cost
        else:
            df_input['product_cost'] = df_input['product_cost'].fillna(calc_cost)

    # Date handling & feature extraction
    if 'date' in df_input.columns:
        parsed_date = pd.to_datetime(df_input['date'], format='mixed', errors='coerce').fillna(pd.Timestamp.now())
    else:
        parsed_date = pd.Series([pd.Timestamp.now()] * len(df_input))

    if 'year' not in df_input.columns:
        df_input['year'] = parsed_date.dt.year
    if 'month' not in df_input.columns:
        df_input['month'] = parsed_date.dt.month
    if 'day' not in df_input.columns:
        df_input['day'] = parsed_date.dt.day
    if 'day_of_week' not in df_input.columns:
        df_input['day_of_week'] = parsed_date.dt.dayofweek

    feature_cols = [
        'labour_hours', 'material_cost', 'product_cost', 'quantity',
        'year', 'month', 'day', 'day_of_week',
        'state', 'district', 'category', 'sector', 'material',
        'product_size', 'demand_level', 'season', 'source'
    ]

    # Predict using loaded scikit-learn Pipeline
    raw_predictions = pipeline.predict(df_input[feature_cols])

    # Ensure predictions are strictly positive
    clipped_predictions = np.clip(raw_predictions, a_min=0, a_max=None)
    rounded_predictions = [round(float(p), 2) for p in clipped_predictions]

    return rounded_predictions[0] if is_single else rounded_predictions

if __name__ == '__main__':
    # Quick sanity check
    test_sample = {
        'labour_hours': 12.0,
        'material_cost': 200.0,
        'product_cost': 1000.0,
        'quantity': 1,
        'category': 'Wood Craft',
        'material': 'Wood',
        'product_size': 'Medium',
        'state': 'Andhra Pradesh',
        'district': 'Chittoor'
    }
    predicted = predict_price(test_sample)
    print(f"[Sanity Check] Input Sample: {test_sample}")
    print(f"[Sanity Check] Predicted Market Price: Rs. {predicted}")
