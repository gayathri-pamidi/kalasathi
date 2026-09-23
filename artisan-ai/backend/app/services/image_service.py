import io
from fastapi import UploadFile, HTTPException, status
from PIL import Image, UnidentifiedImageError
import cv2
import numpy as np

from app.config import config
from app.schemas.image_schemas import ImageUploadResponse, ImageProcessResponse
from app.services.storage_service import save_image_file, save_processed_image_file

ALLOWED_MIME_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


async def process_and_save_image(file: UploadFile) -> ImageUploadResponse:
    """Phase 1: Basic image upload, validation, and storage."""
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

    # 2. Read file contents
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

    # 3. Verify that file is actually a valid image using Pillow
    try:
        image = Image.open(io.BytesIO(file_bytes))
        image.verify()  # Verify image integrity
        image = Image.open(io.BytesIO(file_bytes))
    except (UnidentifiedImageError, OSError, Exception):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or corrupted image file."
        )

    # 4. Check image format
    img_format = image.format.upper() if image.format else ""
    if img_format not in ALLOWED_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image format '{img_format}'. Supported formats: JPEG, PNG, WEBP."
        )

    width, height = image.size

    # 5. Save uploaded image using storage_service
    try:
        save_image_file(file_bytes, file.filename)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Storage failure: {str(e)}"
        )

    # 6. Return response
    return ImageUploadResponse(
        filename=file.filename,
        format=img_format,
        width=width,
        height=height,
        status="uploaded successfully"
    )


def enhance_image_cv(file_bytes: bytes, img_format: str) -> tuple[bytes, int, int, int, int]:
    """
    OpenCV Preprocessing Pipeline:
    Resize (aspect-ratio preserving) -> Noise Reduction -> Contrast (LAB + CLAHE) -> Controlled Sharpening.
    Returns (processed_image_bytes, orig_width, orig_height, proc_width, proc_height).
    """
    try:
        # Decode image bytes into NumPy array for OpenCV
        nparr = np.frombuffer(file_bytes, np.uint8)
        cv_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if cv_img is None:
            raise ValueError("OpenCV failed to decode image array.")

        orig_h, orig_w = cv_img.shape[:2]

        if orig_h <= 0 or orig_w <= 0:
            raise ValueError("Invalid image dimensions.")

        # 1. Resizing (preserve aspect ratio, scale down if exceeding max dimension)
        max_dim = config.MAX_IMAGE_DIMENSION
        if orig_w > max_dim or orig_h > max_dim:
            scale = max_dim / float(max(orig_w, orig_h))
            proc_w = max(1, int(round(orig_w * scale)))
            proc_h = max(1, int(round(orig_h * scale)))
            resized_img = cv2.resize(cv_img, (proc_w, proc_h), interpolation=cv2.INTER_AREA)
        else:
            proc_w, proc_h = orig_w, orig_h
            resized_img = cv_img

        # 2. Moderate Noise Reduction (Bilateral Filter preserves edges/textures while smoothing noise)
        denoised_img = cv2.bilateralFilter(resized_img, d=5, sigmaColor=35, sigmaSpace=35)

        # 3. Contrast Improvement (LAB color space + CLAHE on L-channel to preserve authentic product colors)
        lab = cv2.cvtColor(denoised_img, cv2.COLOR_BGR2LAB)
        l_channel, a_channel, b_channel = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=1.5, tileGridSize=(8, 8))
        l_enhanced = clahe.apply(l_channel)
        enhanced_lab = cv2.merge((l_enhanced, a_channel, b_channel))
        contrast_img = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)

        # 4. Controlled Sharpening (Unsharp Masking to highlight artisan craft details without halos)
        blurred = cv2.GaussianBlur(contrast_img, (0, 0), sigmaX=3.0)
        sharpened_img = cv2.addWeighted(contrast_img, 1.3, blurred, -0.3, 0)

        # 5. Output Encoding
        ext_map = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}
        ext = ext_map.get(img_format.upper(), ".jpg")
        success, encoded_buf = cv2.imencode(ext, sharpened_img)

        if not success:
            raise ValueError(f"Failed to encode processed image to format {img_format}")

        return encoded_buf.tobytes(), orig_w, orig_h, proc_w, proc_h

    except Exception as e:
        raise RuntimeError(f"OpenCV processing error: {str(e)}")


async def process_and_enhance_image(file: UploadFile) -> ImageProcessResponse:
    """Phase 2: Product image upload, validation, OpenCV enhancement pipeline, and storage."""
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

    # 2. Read file contents
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

    # 3. Verify file integrity using Pillow
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

    # 4. Process image using OpenCV pipeline
    try:
        proc_bytes, orig_w, orig_h, proc_w, proc_h = enhance_image_cv(file_bytes, img_format)
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image processing failed: {str(e)}"
        )

    # 5. Save original and processed images safely
    try:
        save_image_file(file_bytes, file.filename)
        _, proc_filename = save_processed_image_file(proc_bytes, file.filename)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Storage failure: {str(e)}"
        )

    # 6. Return response
    return ImageProcessResponse(
        original_filename=file.filename,
        processed_filename=proc_filename,
        original_width=orig_w,
        original_height=orig_h,
        processed_width=proc_w,
        processed_height=proc_h,
        status="processed successfully"
    )
