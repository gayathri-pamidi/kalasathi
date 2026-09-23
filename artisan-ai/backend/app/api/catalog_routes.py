from fastapi import APIRouter, UploadFile, File, status, HTTPException
from app.schemas.catalog import CatalogItem
from app.services.catalog_service import generate_catalog_from_image

router = APIRouter(tags=["Catalog AI"])


@router.post("/generate", response_model=CatalogItem, status_code=status.HTTP_200_OK)
async def generate_catalog(file: UploadFile = File(...)):
    """
    Upload an artisan product image to automatically extract attributes and generate
    a structured product catalog entry (title, category, material, size, description, colors).
    The description and attributes are editable by the artisan.
    """
    return await generate_catalog_from_image(file)
