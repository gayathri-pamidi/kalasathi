import os
import pytest
from fastapi.testclient import TestClient
from PIL import Image
import io

from app.main import app

client = TestClient(app)


def create_dummy_image_bytes(format="JPEG", size=(300, 300), color=(180, 100, 50)):
    buf = io.BytesIO()
    img = Image.new("RGB", size, color=color)
    img.save(buf, format=format)
    buf.seek(0)
    return buf.getvalue()


def test_pricing_api_loads_xgboost_model_and_predicts():
    payload = {
        "category": "Textile Craft",
        "sector": "Handicraft",
        "material": "Cotton",
        "product_size": "Medium",
        "state": "Andhra Pradesh",
        "quantity": 1,
        "labour_hours": 10.0,
        "material_cost": 250.0
    }
    response = client.post("/api/v1/pricing/predict", json=payload)
    assert response.status_code == 200, f"Error: {response.text}"
    data = response.json()
    
    assert data["success"] is True
    assert data["model"] == "XGBoost Regressor"
    assert data["predicted_market_price"] > 0
    assert data["recommended_min_price"] < data["predicted_market_price"]
    assert data["recommended_max_price"] > data["predicted_market_price"]


def test_pricing_api_handles_missing_cost_fields_safely():
    payload = {
        "category": "Wood Craft",
        "material": "Wood"
    }
    response = client.post("/api/v1/pricing/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["success"] is True
    assert data["predicted_market_price"] > 0
    assert "field_breakdown" in data
    assert data["field_breakdown"]["labour_hours"]["is_fallback"] is True
    assert data["field_breakdown"]["material_cost"]["is_fallback"] is True
    assert data["field_breakdown"]["product_cost"]["is_fallback"] is True


def test_pricing_api_artisan_edited_values():
    payload = {
        "category": "Pottery",
        "sector": "Handicraft",
        "material": "Clay",
        "product_size": "Large",
        "state": "Rajasthan",
        "labour_hours": 15.0,
        "material_cost": 400.0,
        "product_cost": 1300.0
    }
    response = client.post("/api/v1/pricing/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["success"] is True
    assert data["field_breakdown"]["category"]["value"] == "Pottery"
    assert data["field_breakdown"]["material"]["value"] == "Clay"
    assert data["field_breakdown"]["state"]["value"] == "Rajasthan"
    assert data["field_breakdown"]["labour_hours"]["value"] == 15.0
    assert data["field_breakdown"]["material_cost"]["value"] == 400.0
    assert data["field_breakdown"]["product_cost"]["value"] == 1300.0


def test_catalog_generation_from_image():
    img_bytes = create_dummy_image_bytes(format="JPEG", color=(150, 75, 25))
    files = {"file": ("test_pot.jpg", img_bytes, "image/jpeg")}
    
    response = client.post("/api/v1/catalog/generate", files=files)
    assert response.status_code == 200, f"Error: {response.text}"
    data = response.json()
    
    assert "product_name" in data
    assert "category" in data
    assert "material" in data
    assert "description" in data
    assert len(data["description"]) > 20
    assert "dominant_colors" in data


def test_full_image_attribute_to_pricing_pipeline():
    # 1. Generate Catalog from Image
    img_bytes = create_dummy_image_bytes(format="JPEG", color=(100, 150, 200))
    files = {"file": ("test_craft.jpg", img_bytes, "image/jpeg")}
    
    cat_resp = client.post("/api/v1/catalog/generate", files=files)
    assert cat_resp.status_code == 200
    cat_data = cat_resp.json()
    
    # 2. Pass extracted catalog attributes to Pricing API
    pricing_payload = {
        "category": cat_data["category"],
        "sector": cat_data["sector"],
        "material": cat_data["material"],
        "product_size": cat_data["product_size"],
        "state": "Andhra Pradesh",
        "quantity": 1
    }
    
    pricing_resp = client.post("/api/v1/pricing/predict", json=pricing_payload)
    assert pricing_resp.status_code == 200
    pricing_data = pricing_resp.json()
    
    assert pricing_data["success"] is True
    assert pricing_data["predicted_market_price"] > 0
    assert pricing_data["model"] == "XGBoost Regressor"
