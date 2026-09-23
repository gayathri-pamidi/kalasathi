import io
from typing import Optional
from fastapi import UploadFile, HTTPException, status
from PIL import Image, UnidentifiedImageError
import rembg

from app.config import config
from app.schemas.image_schemas import BackgroundRemovalResponse
from app.services.storage_service import save_image_file, save_transparent_image_file

ALLOWED_MIME_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}

# Global singleton session cache for ONNX U²-Net model
_rembg_session: Optional[rembg.sessions.BaseSession] = None


def get_rembg_session() -> rembg.sessions.BaseSession:
    """Returns singleton cached rembg model session, initializing once on first call."""
    global _rembg_session
    if _rembg_session is None:
        model_name = config.BACKGROUND_REMOVAL_MODEL
        try:
            _rembg_session = rembg.new_session(model_name)
        except Exception as e:
            raise RuntimeError(f"Failed to initialize background removal AI model '{model_name}': {str(e)}")
    return _rembg_session


async def remove_product_background(file: UploadFile) -> BackgroundRemovalResponse:
    """
    Service handler for AI product background removal.
    Uses cached pretrained U²-Net model to extract product foreground into transparent PNG.
    """
    if not file or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided or filename is empty."
        )

    # 1. Validate MIME type
    content_type = file.content_type.lower() if file.content_type else ""
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{file.content_type}'. Allowed types: JPEG, PNG, WEBP."
        )

    # 2. Read file bytes
    try:
        file_bytes = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read file data: {str(e)}"
        )

    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    # 3. Verify image integrity with Pillow
    try:
        image = Image.open(io.BytesIO(file_bytes))
        image.verify()
        image = Image.open(io.BytesIO(file_bytes))
    except (UnidentifiedImageError, OSError, Exception):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or corrupted image file."
        )

    img_format = image.format.upper() if image.format else ""
    if img_format not in ALLOWED_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image format '{img_format}'. Supported formats: JPEG, PNG, WEBP."
        )

    # 4. Perform AI background removal using cached rembg session
    try:
        session = get_rembg_session()
        transparent_bytes = rembg.remove(file_bytes, session=session)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI model inference failed: {str(e)}"
        )

    # 5. Verify output is valid transparent PNG with Alpha channel
    try:
        output_image = Image.open(io.BytesIO(transparent_bytes))
        has_transparency = output_image.mode in ("RGBA", "LA") or (
            output_image.mode == "P" and "transparency" in output_image.info
        )
        if not has_transparency:
            raise ValueError("Output image does not contain an alpha channel / transparency.")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Invalid transparent image output: {str(e)}"
        )

    # 6. Save original image and transparent output image to storage
    try:
        save_image_file(file_bytes, file.filename)
        _, output_filename = save_transparent_image_file(transparent_bytes, file.filename)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Storage failure: {str(e)}"
        )

    # 7. Return structured JSON response
    return BackgroundRemovalResponse(
        original_filename=file.filename,
        output_filename=output_filename,
        output_format="PNG",
        has_transparency=has_transparency,
        status="background removed successfully"
    )
