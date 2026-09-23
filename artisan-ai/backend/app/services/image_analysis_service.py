import io
from typing import Optional, List, Dict, Tuple
from fastapi import UploadFile, HTTPException, status
from PIL import Image, UnidentifiedImageError
import numpy as np
import cv2
import torch
import torch.nn as nn
import torchvision.models as models

from torchvision.models import MobileNet_V3_Small_Weights

from app.schemas.image_schemas import (
    ImageAnalysisResponse,
    ProductAnalysis,
    DominantColor,
    ImageQualityMetrics,
)

ALLOWED_MIME_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}

# Palette of standard reference color names and RGB values for color mapping
COLOR_PALETTE = {
    "brown": (139, 69, 19),
    "tan": (210, 180, 140),
    "orange": (255, 140, 0),
    "red": (220, 20, 60),
    "yellow": (255, 215, 0),
    "cream": (255, 253, 208),
    "white": (255, 255, 255),
    "black": (20, 20, 20),
    "gray": (128, 128, 128),
    "green": (34, 139, 34),
    "teal": (0, 128, 128),
    "blue": (30, 144, 255),
    "purple": (128, 0, 128),
    "pink": (255, 105, 180),
}

# ImageNet Class Index Keywords -> Artisan Category / Product Type / Material Mapping
ARTISAN_MAPPINGS = [
    # Pottery
    (["pitcher", "vase", "pot", "crock", "urn", "jar", "earthenware", "terracotta", "jug", "mortar"], "pottery", "handmade clay pot", "clay", 0.85, 0.80),
    # Textiles / Rugs
    (["quilt", "blanket", "rug", "carpet", "tapestry", "fabric", "weave", "doormat"], "textiles", "handwoven textile", "cotton / wool", 0.82, 0.75),
    # Sarees / Apparel
    (["sari", "saree", "shawl", "stole", "kimono", "stole", "gown", "cloak", "poncho"], "sarees", "handwoven saree / shawl", "silk", 0.84, 0.78),
    # Jewelry
    (["necklace", "bracelet", "ring", "earring", "pendant", "chain", "bead", "locket"], "jewelry", "artisan jewelry", "metal / beads", 0.88, 0.82),
    # Woodcraft
    (["chest", "box", "clog", "wooden", "carving", "cask", "barrel"], "woodcraft", "carved woodcraft", "wood", 0.81, 0.74),
    # Metalcraft
    (["brass", "bronze", "copper", "bell", "gong", "statue", "candle", "candlestick", "chime"], "metalcraft", "handcrafted metalwork", "brass / copper", 0.83, 0.76),
    # Baskets
    (["basket", "wicker", "hamper", "shopping_basket"], "baskets", "woven basket", "cane / wicker", 0.86, 0.80),
    # Paintings
    (["painting", "canvas", "picture_frame", "tapestry", "artwork"], "paintings", "hand-painted artwork", "canvas", 0.80, 0.70),
]

# Singleton PyTorch Vision Model Cache
_vision_model: Optional[nn.Module] = None
_vision_weights = None


def get_vision_model() -> Tuple[nn.Module, object]:
    """Loads and caches the pretrained PyTorch MobileNetV3 Small model singleton."""
    global _vision_model, _vision_weights
    if _vision_model is None:
        try:
            _vision_weights = MobileNet_V3_Small_Weights.DEFAULT
            model = models.mobilenet_v3_small(weights=_vision_weights)
            model.eval()
            _vision_model = model
        except Exception as e:
            raise RuntimeError(f"Failed to initialize vision AI model: {str(e)}")
    return _vision_model, _vision_weights


def map_rgb_to_color_name(rgb: np.ndarray) -> str:
    """Finds closest color name in RGB palette using minimum Euclidean distance."""
    min_dist = float("inf")
    closest_color = "gray"
    r, g, b = int(rgb[0]), int(rgb[1]), int(rgb[2])


    for name, (pr, pg, pb) in COLOR_PALETTE.items():
        dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2
        if dist < min_dist:
            min_dist = dist
            closest_color = name
    return closest_color


def extract_dominant_colors_cv(pil_img: Image.Image, k: int = 3) -> List[DominantColor]:
    """
    Alpha-aware K-Means dominant color extraction.
    If image has transparency (Phase 3 PNG), filters for foreground pixels (alpha > 10).
    """
    if pil_img.mode in ("RGBA", "LA") or (pil_img.mode == "P" and "transparency" in pil_img.info):
        rgba = np.array(pil_img.convert("RGBA"))
        alpha = rgba[:, :, 3]
        fg_mask = alpha > 10
        rgb_pixels = rgba[:, :, :3][fg_mask]
    else:
        rgb = np.array(pil_img.convert("RGB"))
        rgb_pixels = rgb.reshape(-1, 3)

    if len(rgb_pixels) == 0:
        return [DominantColor(name="white", percentage=100.0)]

    # Convert to float32 for OpenCV K-Means
    pixels = np.float32(rgb_pixels)
    if len(pixels) < k:
        k = len(pixels)

    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
    flags = cv2.KMEANS_RANDOM_CENTERS
    compactness, labels, centers = cv2.kmeans(pixels, k, None, criteria, 10, flags)

    counts = np.bincount(labels.flatten())
    total_count = len(labels)

    dominant_colors = []
    seen_names = set()

    # Sort clusters by size
    sorted_indices = np.argsort(-counts)
    for idx in sorted_indices:
        center_rgb = np.uint8(centers[idx])
        color_name = map_rgb_to_color_name(center_rgb)
        pct = round(float(counts[idx] / total_count * 100.0), 1)

        # Merge duplicate color names if K-Means split same color family
        if color_name in seen_names:
            for item in dominant_colors:
                if item.name == color_name:
                    item.percentage = round(item.percentage + pct, 1)
                    break
        else:
            seen_names.add(color_name)
            dominant_colors.append(DominantColor(name=color_name, percentage=pct))

    return dominant_colors[:3]


def calculate_image_quality_cv(pil_img: Image.Image) -> ImageQualityMetrics:
    """
    Calculates measurable computer vision metrics:
    - Brightness: Mean luminance normalized [0.0, 1.0]
    - Contrast: Std dev luminance normalized [0.0, 1.0]
    - Sharpness: Normalized Laplacian variance [0.0, 1.0]
    """
    gray = np.array(pil_img.convert("L"))

    # Mask transparent background if RGBA
    if pil_img.mode in ("RGBA", "LA") or (pil_img.mode == "P" and "transparency" in pil_img.info):
        rgba = np.array(pil_img.convert("RGBA"))
        alpha = rgba[:, :, 3]
        fg_mask = alpha > 10
        if np.any(fg_mask):
            gray_pixels = gray[fg_mask]
        else:
            gray_pixels = gray.flatten()
    else:
        gray_pixels = gray.flatten()

    brightness = round(float(np.mean(gray_pixels) / 255.0), 2)
    contrast = round(float(min(1.0, np.std(gray_pixels) / 128.0)), 2)

    # Laplacian variance measure for sharpness
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    sharpness = round(float(min(1.0, laplacian_var / 500.0)), 2)

    return ImageQualityMetrics(
        brightness=brightness,
        contrast=contrast,
        sharpness=sharpness
    )


async def analyze_product_image(file: UploadFile) -> ImageAnalysisResponse:
    """
    Phase 5: AI-Based Artisan Product Image Analysis.
    Combines pretrained PyTorch vision model semantics with classical computer vision feature extraction.
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
        pil_img = Image.open(io.BytesIO(file_bytes))
        pil_img.verify()
        pil_img = Image.open(io.BytesIO(file_bytes))
    except (UnidentifiedImageError, OSError, Exception):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or corrupted image file."
        )

    img_format = pil_img.format.upper() if pil_img.format else ""
    if img_format not in ALLOWED_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image format '{img_format}'. Supported formats: JPEG, PNG, WEBP."
        )

    # 4. Extract Classical Computer Vision Measurable Features
    dominant_colors = extract_dominant_colors_cv(pil_img, k=3)
    quality_metrics = calculate_image_quality_cv(pil_img)

    # 5. Extract Visual Feature Descriptors
    orig_w, orig_h = pil_img.size
    aspect_ratio = orig_w / float(orig_h)

    visual_features = []
    if 0.85 <= aspect_ratio <= 1.15:
        visual_features.append("round / balanced shape")
    elif aspect_ratio < 0.85:
        visual_features.append("vertical orientation")
    else:
        visual_features.append("horizontal orientation")

    if pil_img.mode in ("RGBA", "LA") or (pil_img.mode == "P" and "transparency" in pil_img.info):
        rgba = np.array(pil_img.convert("RGBA"))
        alpha = rgba[:, :, 3]
        coverage = round(float(np.mean(alpha > 10) * 100.0), 1)
        visual_features.append(f"product coverage {coverage}%")
        visual_features.append("isolated product foreground")
    else:
        visual_features.append("standard background photo")

    if quality_metrics.sharpness > 0.6:
        visual_features.append("sharp detail")
    elif quality_metrics.sharpness < 0.2:
        visual_features.append("smooth texture")

    # 6. Execute Pretrained PyTorch Vision Model Semantic Inference
    try:
        model, weights = get_vision_model()
        preprocess = weights.transforms()
        rgb_img = pil_img.convert("RGB")
        input_tensor = preprocess(rgb_img).unsqueeze(0)

        with torch.no_grad():
            logits = model(input_tensor)
            probabilities = torch.softmax(logits, dim=1)[0]

        top_prob, top_idx = torch.max(probabilities, dim=0)
        label_name = weights.meta["categories"][top_idx.item()].lower()
        model_conf = round(float(top_prob.item()), 2)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vision model inference failed: {str(e)}"
        )

    # 7. Map ImageNet Prediction to Artisan Product Category & Type
    mapped_category = "handicrafts"
    mapped_type = "artisan craft item"
    mapped_material = "unknown"
    cat_conf = 0.50
    mat_conf = 0.00

    for keywords, category, ptype, material, cconf, mconf in ARTISAN_MAPPINGS:
        if any(kw in label_name for kw in keywords):
            mapped_category = category
            mapped_type = ptype
            mapped_material = material
            cat_conf = min(1.0, round(model_conf * cconf + 0.35, 2))
            mat_conf = mconf
            break

    # If unmapped but high model confidence, format product type nicely
    if mapped_category == "handicrafts" and model_conf > 0.3:
        mapped_type = label_name.replace("_", " ")

    # 8. Generate AI Product Title and Description from Analysis
    color_names = [c.name for c in dominant_colors[:2]]
    color_str = " & ".join(c.capitalize() for c in color_names) if color_names else ""
    
    cat_title = mapped_category.capitalize() if mapped_category != "handicrafts" else "Handicraft"
    type_title = mapped_type.title()
    material_str = mapped_material.capitalize() if mapped_material != "unknown" else ""

    title_parts = [p for p in [color_str, material_str, type_title] if p]
    suggested_title = " ".join(title_parts) if title_parts else f"Artisan Handcrafted {cat_title}"

    desc_parts = []
    desc_parts.append(f"Authentic Indian {mapped_type} handcrafted by skilled artisans.")
    if color_str:
        desc_parts.append(f"Features rich {color_str} color tones.")
    if material_str:
        desc_parts.append(f"Made using high-quality natural {mapped_material}.")
    if "isolated product foreground" in visual_features:
        desc_parts.append("Studio-quality background-cleared product image.")
    desc_parts.append("Perfect addition to home decor or traditional handicraft collections.")
    
    suggested_description = " ".join(desc_parts)

    product_analysis = ProductAnalysis(
        product_category=mapped_category,
        product_type=mapped_type,
        category_confidence=cat_conf,
        dominant_colors=dominant_colors,
        estimated_material=mapped_material,
        material_confidence=mat_conf,
        visual_features=visual_features,
        image_quality=quality_metrics,
        suggested_title=suggested_title,
        suggested_description=suggested_description,
    )

    return ImageAnalysisResponse(
        original_filename=file.filename,
        analysis=product_analysis,
        status="image analysis completed successfully"
    )
