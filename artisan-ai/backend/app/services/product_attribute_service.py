import io
from typing import Optional, Dict, List, Union
from fastapi import UploadFile
from PIL import Image

from app.schemas.catalog import ProductAttributeResult
from app.services.image_analysis_service import analyze_product_image

# Canonical ML-recognized mapping dictionaries
ML_CATEGORY_MAP = {
    "pottery": "Pottery",
    "woodcraft": "Wood Craft",
    "textiles": "Textile Craft",
    "sarees": "Textile Craft",
    "metalcraft": "Metal Craft",
    "baskets": "Bamboo Craft",
    "jewelry": "Metal Craft",
    "paintings": "Wood Craft"
}

ML_SECTOR_MAP = {
    "pottery": "Handicraft",
    "woodcraft": "Handicraft",
    "textiles": "Handloom",
    "sarees": "Handloom",
    "metalcraft": "Handicraft",
    "baskets": "Handicraft",
    "jewelry": "Handicraft",
    "paintings": "Handicraft"
}

ML_MATERIAL_MAP = {
    "clay": "Clay",
    "wood": "Wood",
    "metal": "Metal",
    "brass / copper": "Metal",
    "cotton / wool": "Cotton",
    "silk": "Cotton",
    "cane / wicker": "Bamboo",
    "leather": "Leather",
    "metal / beads": "Metal",
    "canvas": "Natural Fibre"
}

async def extract_product_attributes_from_image(file: UploadFile) -> ProductAttributeResult:
    """
    Phase 1: Product Attribute Extraction Service.
    Extracts structured product attributes from a processed image using image_analysis_service.
    Returns structured ProductAttributeResult with confidence scores and non-hallucinated fallbacks.
    """
    analysis_resp = await analyze_product_image(file)
    analysis = analysis_resp.analysis

    # Dominant colors list
    colors = [color.name for color in analysis.dominant_colors]
    visual_feats = analysis.visual_features

    raw_cat = analysis.product_category.lower()
    raw_mat = analysis.estimated_material.lower()
    cat_conf = analysis.category_confidence
    mat_conf = analysis.material_confidence

    # Map to canonical ML category
    if cat_conf >= 0.35 and raw_cat in ML_CATEGORY_MAP:
        category = ML_CATEGORY_MAP[raw_cat]
        sector = ML_SECTOR_MAP.get(raw_cat, "Handicraft")
    elif cat_conf >= 0.30:
        category = "Handicraft"
        sector = "Handicraft"
    else:
        category = None
        sector = None

    # Map to canonical ML material
    if mat_conf > 0.0 and raw_mat in ML_MATERIAL_MAP:
        material = ML_MATERIAL_MAP[raw_mat]
    elif mat_conf > 0.0:
        material = raw_mat.capitalize()
    else:
        material = "Unknown"

    # Infer product_size from image coverage / aspect ratio if available
    product_size = "Medium"  # Default sensible estimate
    for feat in visual_feats:
        if "coverage" in feat:
            try:
                # e.g. "product coverage 85.2%"
                pct = float(feat.split("coverage")[1].replace("%", "").strip())
                if pct > 80.0:
                    product_size = "Large"
                elif pct < 40.0:
                    product_size = "Small"
            except (ValueError, IndexError):
                pass

    # Build human-readable product name suggestion
    ptype = analysis.product_type
    if ptype and ptype != "artisan craft item":
        product_name = ptype.title()
    elif category:
        product_name = f"Handcrafted {category}"
    else:
        product_name = "Artisan Craft Item"

    confidence_scores = {
        "category": round(cat_conf, 2),
        "material": round(mat_conf, 2),
        "product_size": 0.70 if product_size else 0.0
    }

    return ProductAttributeResult(
        product_name=product_name,
        category=category,
        sector=sector,
        material=material,
        product_size=product_size,
        dominant_colors=colors,
        visual_features=visual_feats,
        confidence=confidence_scores
    )
