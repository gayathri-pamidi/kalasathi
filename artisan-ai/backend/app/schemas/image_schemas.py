from pydantic import BaseModel
from typing import List


class ImageUploadResponse(BaseModel):
    filename: str
    format: str
    width: int
    height: int
    status: str = "uploaded successfully"


class ImageProcessResponse(BaseModel):
    original_filename: str
    processed_filename: str
    original_width: int
    original_height: int
    processed_width: int
    processed_height: int
    status: str = "processed successfully"


class BackgroundRemovalResponse(BaseModel):
    original_filename: str
    output_filename: str
    output_format: str = "PNG"
    has_transparency: bool = True
    status: str = "background removed successfully"


class ImageEnhancementResponse(BaseModel):
    original_filename: str
    output_filename: str
    output_format: str = "PNG"
    original_width: int
    original_height: int
    enhanced_width: int
    enhanced_height: int
    scale_factor: int = 2
    status: str = "image enhanced successfully"


class DominantColor(BaseModel):
    name: str
    percentage: float


class ImageQualityMetrics(BaseModel):
    brightness: float
    contrast: float
    sharpness: float


class ProductAnalysis(BaseModel):
    product_category: str
    product_type: str
    category_confidence: float
    dominant_colors: List[DominantColor]
    estimated_material: str
    material_confidence: float
    visual_features: List[str]
    image_quality: ImageQualityMetrics
    suggested_title: str
    suggested_description: str


class ImageAnalysisResponse(BaseModel):
    original_filename: str
    analysis: ProductAnalysis
    status: str = "image analysis completed successfully"
