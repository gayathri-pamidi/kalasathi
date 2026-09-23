import os
import json
import pytest
import pandas as pd
import numpy as np

from ml.predict_price import predict_price, load_pricing_model
from ml.train_model import train_and_evaluate_pricing_model

def test_dataset_exists_and_loads():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(base_dir, 'datasets', 'sih2.csv')
    assert os.path.exists(csv_path), f"CSV dataset missing at {csv_path}"
    
    df = pd.read_csv(csv_path)
    assert len(df) == 1241, f"Expected 1241 rows, found {len(df)}"
    assert 'market_price' in df.columns, "Target column market_price missing"

def test_training_pipeline_execution():
    results, best_model_name = train_and_evaluate_pricing_model()
    assert best_model_name in ['Random Forest', 'Gradient Boosting', 'XGBoost', 'XGBoost Regressor', 'Linear Regression']
    assert results[best_model_name]['test_r2'] > 0.8, "Model Test R2 score should be above 0.8"

def test_model_files_created():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    joblib_path = os.path.join(base_dir, 'models', 'price_prediction_model.joblib')
    metadata_path = os.path.join(base_dir, 'models', 'model_metadata.json')

    assert os.path.exists(joblib_path), "Model joblib artifact not found"
    assert os.path.exists(metadata_path), "Model metadata JSON not found"

    with open(metadata_path, 'r') as f:
        meta = json.load(f)
    
    assert 'model_name' in meta
    assert 'test_mae' in meta
    assert meta['test_r2'] > 0.8

def test_prediction_returns_valid_positive_number():
    sample_input = {
        'labour_hours': 10.0,
        'material_cost': 250.0,
        'product_cost': 850.0,
        'quantity': 1,
        'category': 'Pottery',
        'material': 'Clay',
        'product_size': 'Large',
        'state': 'Andhra Pradesh',
        'district': 'Alluri Sitarama Raju',
        'demand_level': 'High',
        'season': 'Winter'
    }
    
    predicted_price = predict_price(sample_input)
    assert isinstance(predicted_price, (float, int, np.floating, np.integer))
    assert predicted_price > 0, f"Predicted price should be positive, got {predicted_price}"
    assert 300 <= predicted_price <= 5000, f"Predicted price {predicted_price} outside realistic range"

def test_prediction_batch_and_defaults():
    sample_batch = [
        {'labour_hours': 5.0, 'material_cost': 100.0},
        {'labour_hours': 15.0, 'material_cost': 400.0, 'product_cost': 1300.0}
    ]
    predictions = predict_price(sample_batch)
    assert isinstance(predictions, list)
    assert len(predictions) == 2
    assert all(isinstance(p, (float, int)) for p in predictions)
    assert all(p > 0 for p in predictions)

if __name__ == '__main__':
    pytest.main([__file__, '-v'])
