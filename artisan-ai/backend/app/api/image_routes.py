from fastapi import APIRouter, UploadFile, File, Response, status
from app.schemas.image_schemas import (
    ImageUploadResponse,
    ImageProcessResponse,
    BackgroundRemovalResponse,
    ImageEnhancementResponse,
    ImageAnalysisResponse,
)
from app.services.image_service import process_and_save_image, process_and_enhance_image
from app.services.background_removal_service import remove_product_background
from app.services.image_enhancement_service import enhance_product_image, enhance_product_image_raw
from app.services.image_analysis_service import analyze_product_image

router = APIRouter(tags=["Product Image AI"])


@router.post("/upload", response_model=ImageUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_image(file: UploadFile = File(...)):
    """
    Upload and validate a product image (JPEG, PNG, WEBP).
    Extracts image metadata and saves image to storage.
    """
    return await process_and_save_image(file)


@router.post("/process", response_model=ImageProcessResponse, status_code=status.HTTP_200_OK)
async def process_image(file: UploadFile = File(...)):
    """
    Upload, validate, and preprocess a product image using OpenCV.
    Applies resizing, noise reduction, contrast enhancement (LAB+CLAHE), and detail sharpening.
    Saves both original and enhanced images to storage.
    """
    return await process_and_enhance_image(file)


@router.post("/remove-background", response_model=BackgroundRemovalResponse, status_code=status.HTTP_200_OK)
async def remove_background(file: UploadFile = File(...)):
    """
    Upload, validate, and remove product background using pretrained U²-Net AI model.
    Produces a transparent PNG image and saves output to storage.
    """
    return await remove_product_background(file)


@router.post("/enhance", response_model=ImageEnhancementResponse, status_code=status.HTTP_200_OK)
async def enhance_image(file: UploadFile = File(...)):
    """
    Upload, validate, and enhance product image using pretrained Real-ESRGAN x2 AI super-resolution model.
    Upscales spatial resolution by 2x while preserving RGBA transparency and product fidelity (JSON response).
    """
    return await enhance_product_image(file)


@router.post("/enhance-image", response_class=Response, status_code=status.HTTP_200_OK)
async def enhance_image_binary(file: UploadFile = File(...)):
    """
    Upload, validate, and enhance product image using Real-ESRGAN x2 AI super-resolution model.
    Returns the actual enhanced PNG image directly as media_type='image/png' for frontend blob consumption.
    """
    enhanced_bytes = await enhance_product_image_raw(file)
    return Response(content=enhanced_bytes, media_type="image/png")



@router.post("/analyze", response_model=ImageAnalysisResponse, status_code=status.HTTP_200_OK)
async def analyze_image(file: UploadFile = File(...)):
    """
    Analyze an artisan product image combining pretrained PyTorch vision semantics and computer vision metrics.
    Extracts structured taxonomy attributes, alpha-aware dominant colors, visual descriptors, and quality metrics.
    """
    return await analyze_product_image(file)
