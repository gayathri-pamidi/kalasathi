from pydantic import BaseModel, Field
from typing import Optional, Dict, Any


class PricingPredictionRequest(BaseModel):
    """
    Pricing prediction request parameters.
    The artisan does not need to enter all ML fields; optional fields use safe defaults/fallbacks.
    """
    category: Optional[str] = Field(None, description="Product category (e.g. Pottery, Wood Craft, Textile Craft)")
    sector: Optional[str] = Field(None, description="Product sector (e.g. Handicraft, Handloom, Textile)")
    material: Optional[str] = Field(None, description="Product material (e.g. Clay, Wood, Metal, Cotton)")
    product_size: Optional[str] = Field(None, description="Product size (Small, Medium, Large)")
    state: Optional[str] = Field("Andhra Pradesh", description="Artisan location state")
    district: Optional[str] = Field("Chittoor", description="Artisan district (excluded from XGBoost model)")
    quantity: Optional[int] = Field(1, ge=1, description="Product batch quantity")
    labour_hours: Optional[float] = Field(None, ge=0.0, description="Artisan labor hours (if known)")
    material_cost: Optional[float] = Field(None, ge=0.0, description="Raw material cost in INR (if known)")
    product_cost: Optional[float] = Field(None, ge=0.0, description="Total product cost in INR (if known)")
    demand_level: Optional[str] = Field(None, description="Market demand level (Low, Medium, High)")
    season: Optional[str] = Field(None, description="Season (Winter, Summer, Monsoon, Festival)")
    source: Optional[str] = Field("Artisan", description="Data source identifier")


class FieldProvenance(BaseModel):
    source_type: str = Field(..., description="'image-derived', 'dataset-default', or 'artisan-confirmed'")
    value: Any = Field(..., description="Field value used for prediction")
    is_fallback: bool = Field(False, description="True if a business fallback default was applied")
    note: Optional[str] = Field(None, description="Explanatory note regarding derivation")


class PricingPredictionResponse(BaseModel):
    """
    Response schema for XGBoost market price prediction.
    """
    success: bool = Field(True, description="Execution success flag")
    predicted_market_price: float = Field(..., description="XGBoost predicted point market price in INR")
    recommended_min_price: float = Field(..., description="Recommended lower boundary (-10% market variance)")
    recommended_max_price: float = Field(..., description="Recommended upper boundary (+10% market variance)")
    model: str = Field("XGBoost Regressor", description="Name of loaded ML model")
    currency: str = Field("INR", description="Currency symbol")
    field_breakdown: Optional[Dict[str, FieldProvenance]] = Field(None, description="Provenance breakdown per feature")
    business_assumptions: Optional[Dict[str, str]] = Field(None, description="Documented business fallbacks used")
