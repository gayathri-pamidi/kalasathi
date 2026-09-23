from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from app.schemas.image_schemas import DominantColor


class ProductAttributeResult(BaseModel):
    """
    Structured product attributes extracted from image analysis.
    """
    product_name: Optional[str] = Field(None, description="Inferred human-readable product title")
    category: Optional[str] = Field(None, description="ML-aligned artisan product category (e.g. Pottery, Wood Craft)")
    sector: Optional[str] = Field(None, description="Artisan sector (e.g. Handicraft, Handloom, Textile)")
    material: Optional[str] = Field(None, description="Primary visual material (e.g. Clay, Wood, Metal, Cotton)")
    product_size: Optional[str] = Field(None, description="Estimated product size (Small, Medium, Large)")
    dominant_colors: List[str] = Field(default_factory=list, description="Primary visual color names")
    visual_features: List[str] = Field(default_factory=list, description="Key computer vision feature descriptors")
    confidence: Dict[str, float] = Field(default_factory=dict, description="Confidence scores per extracted attribute")


class CatalogItem(BaseModel):
    """
    Generated product catalog item ready for artisan review and editing.
    """
    product_name: str = Field(..., description="Product title")
    category: str = Field(..., description="Artisan product category")
    sector: str = Field(..., description="Product sector")
    material: str = Field(..., description="Primary material")
    product_size: str = Field(..., description="Product size estimate")
    description: str = Field(..., description="Artisan product description (editable by artisan)")
    visual_features: List[str] = Field(default_factory=list, description="Visual descriptors")
    dominant_colors: List[str] = Field(default_factory=list, description="Dominant colors")
    attribute_confidence: Dict[str, float] = Field(default_factory=dict, description="Confidence mapping")
    status: str = Field("catalog generated successfully", description="Status message")
