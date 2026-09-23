import os
import sys
from datetime import datetime
from typing import Dict, Any, Tuple

# Ensure artisan-ai root is in sys.path for importing ml.predict_price
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from ml.predict_price import predict_price
from app.schemas.pricing import (
    PricingPredictionRequest,
    PricingPredictionResponse,
    FieldProvenance
)


def get_current_season() -> str:
    """
    Derives season from current calendar month.
    Dec-Feb: Winter, Mar-May: Summer, Jun-Sep: Monsoon, Oct-Nov: Festival
    """
    month = datetime.now().month
    if month in [12, 1, 2]:
        return "Winter"
    elif month in [3, 4, 5]:
        return "Summer"
    elif month in [6, 7, 8, 9]:
        return "Monsoon"
    else:
        return "Festival"


def predict_market_price_service(request: PricingPredictionRequest) -> PricingPredictionResponse:
    """
    Phase 3: Pricing Service integrating existing validated XGBoost Regressor model.
    Converts image-derived and artisan inputs into exact feature schema expected by saved XGBoost model.
    Handles fallbacks safely and tracks field provenance explicitly.
    """
    now = datetime.now()
    field_breakdown: Dict[str, FieldProvenance] = {}
    business_assumptions: Dict[str, str] = {}

    # 1. Category
    if request.category:
        category_val = request.category
        cat_src = "artisan-confirmed" if request.category != "Handicraft" else "image-derived"
        cat_fallback = False
    else:
        category_val = "Wood Craft"  # Safe canonical default
        cat_src = "dataset-default"
        cat_fallback = True

    field_breakdown["category"] = FieldProvenance(
        source_type=cat_src, value=category_val, is_fallback=cat_fallback
    )

    # 2. Sector
    if request.sector:
        sector_val = request.sector
        sec_src = "artisan-confirmed"
        sec_fallback = False
    else:
        sector_val = "Handicraft"
        sec_src = "dataset-default"
        sec_fallback = True

    field_breakdown["sector"] = FieldProvenance(
        source_type=sec_src, value=sector_val, is_fallback=sec_fallback
    )

    # 3. Material
    if request.material:
        material_val = request.material
        mat_src = "artisan-confirmed"
        mat_fallback = False
    else:
        material_val = "Wood"
        mat_src = "dataset-default"
        mat_fallback = True

    field_breakdown["material"] = FieldProvenance(
        source_type=mat_src, value=material_val, is_fallback=mat_fallback
    )

    # 4. Product Size
    if request.product_size:
        size_val = request.product_size
        size_src = "artisan-confirmed"
        size_fallback = False
    else:
        size_val = "Medium"
        size_src = "dataset-default"
        size_fallback = True

    field_breakdown["product_size"] = FieldProvenance(
        source_type=size_src, value=size_val, is_fallback=size_fallback
    )

    # 5. State & District
    state_val = request.state if request.state else "Andhra Pradesh"
    field_breakdown["state"] = FieldProvenance(
        source_type="artisan-confirmed" if request.state else "dataset-default",
        value=state_val,
        is_fallback=request.state is None
    )

    # 6. Demand Level
    demand_val = request.demand_level if request.demand_level else "Medium"
    field_breakdown["demand_level"] = FieldProvenance(
        source_type="artisan-confirmed" if request.demand_level else "dataset-default",
        value=demand_val,
        is_fallback=request.demand_level is None
    )

    # 7. Season
    season_val = request.season if request.season else get_current_season()
    field_breakdown["season"] = FieldProvenance(
        source_type="artisan-confirmed" if request.season else "dataset-default",
        value=season_val,
        is_fallback=request.season is None,
        note="Auto-derived from current calendar month" if not request.season else None
    )

    # 8. Quantity
    qty_val = request.quantity if request.quantity and request.quantity >= 1 else 1
    field_breakdown["quantity"] = FieldProvenance(
        source_type="artisan-confirmed" if request.quantity else "dataset-default",
        value=qty_val,
        is_fallback=False
    )

    # 9. Labour Hours
    if request.labour_hours is not None and request.labour_hours >= 0:
        labour_val = float(request.labour_hours)
        labour_src = "artisan-confirmed"
        labour_fallback = False
    else:
        labour_val = 8.0
        labour_src = "dataset-default"
        labour_fallback = True
        business_assumptions["labour_hours"] = "Default 8.0 hours assumed when not provided by artisan."

    field_breakdown["labour_hours"] = FieldProvenance(
        source_type=labour_src, value=labour_val, is_fallback=labour_fallback
    )

    # 10. Material Cost
    if request.material_cost is not None and request.material_cost >= 0:
        mat_cost_val = float(request.material_cost)
        mat_cost_src = "artisan-confirmed"
        mat_cost_fallback = False
    else:
        mat_cost_val = 150.0
        mat_cost_src = "dataset-default"
        mat_cost_fallback = True
        business_assumptions["material_cost"] = "Default ₹150.0 raw material cost assumed when not provided by artisan."

    field_breakdown["material_cost"] = FieldProvenance(
        source_type=mat_cost_src, value=mat_cost_val, is_fallback=mat_cost_fallback
    )

    # 11. Product Cost Calculation
    if request.product_cost is not None and request.product_cost >= 0:
        prod_cost_val = float(request.product_cost)
        prod_cost_src = "artisan-confirmed"
        prod_cost_fallback = False
    else:
        # Business calculation: material_cost + (labour_hours * ₹60/hour labor rate)
        prod_cost_val = mat_cost_val + (labour_val * 60.0)
        prod_cost_src = "dataset-default"
        prod_cost_fallback = True
        business_assumptions["product_cost"] = (
            "Calculated via business rule: product_cost = material_cost + (labour_hours * ₹60.0/hr labor rate)."
        )

    field_breakdown["product_cost"] = FieldProvenance(
        source_type=prod_cost_src, value=prod_cost_val, is_fallback=prod_cost_fallback
    )

    # Prepare input dictionary for predict_price
    input_data = {
        "labour_hours": labour_val,
        "material_cost": mat_cost_val,
        "product_cost": prod_cost_val,
        "quantity": qty_val,
        "state": state_val,
        "district": request.district or "Chittoor",
        "category": category_val,
        "sector": sector_val,
        "material": material_val,
        "product_size": size_val,
        "demand_level": demand_val,
        "season": season_val,
        "source": request.source or "Artisan",
        "date": now.strftime("%Y-%m-%d")
    }

    # Execute prediction via loaded XGBoost Regressor model
    predicted_raw = predict_price(input_data)
    predicted_price = float(round(predicted_raw, 2))

    # Calculate recommended min/max range (documented ±10% market variance recommendation)
    rec_min_price = float(round(predicted_price * 0.90, 2))
    rec_max_price = float(round(predicted_price * 1.10, 2))

    business_assumptions["price_range"] = (
        "Recommended min/max price range is calculated as ±10% market variance around the XGBoost point prediction."
    )

    return PricingPredictionResponse(
        success=True,
        predicted_market_price=predicted_price,
        recommended_min_price=rec_min_price,
        recommended_max_price=rec_max_price,
        model="XGBoost Regressor",
        currency="INR",
        field_breakdown=field_breakdown,
        business_assumptions=business_assumptions
    )
