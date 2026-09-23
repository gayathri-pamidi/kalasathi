from typing import Optional, Dict, Any
from fastapi import UploadFile

from app.schemas.catalog import CatalogItem, ProductAttributeResult
from app.services.product_attribute_service import extract_product_attributes_from_image


def generate_catalog_description(
    product_name: str,
    category: str,
    material: str,
    product_size: str,
    dominant_colors: list,
    visual_features: list
) -> str:
    """
    Generates a structured, elegant, artisan-focused catalog description.
    This description is returned to the frontend and can be edited by the artisan.
    """
    color_str = ", ".join(dominant_colors) if dominant_colors else "natural tone"
    feat_str = ", ".join(visual_features) if visual_features else "authentic craftsmanship"

    desc = (
        f"Handcrafted {product_name} crafted in the traditional {category} style. "
        f"Features high-quality {material} construction in a {product_size.lower()} form factor, "
        f"accentuated by a distinct {color_str} color palette. "
        f"Visual characteristics include {feat_str}. Perfect for cultural markets, "
        f"home decor, and artisan exhibitions."
    )
    return desc


async def generate_catalog_from_image(file: UploadFile) -> CatalogItem:
    """
    Phase 2: Catalog Generation Service.
    Generates structured product catalog information directly from an uploaded image.
    Returns JSON-compatible CatalogItem.
    """
    attributes: ProductAttributeResult = await extract_product_attributes_from_image(file)

    p_name = attributes.product_name or "Artisan Craft Item"
    cat = attributes.category or "Handicraft"
    sec = attributes.sector or "Handicraft"
    mat = attributes.material or "Natural Material"
    size = attributes.product_size or "Medium"

    description = generate_catalog_description(
        product_name=p_name,
        category=cat,
        material=mat,
        product_size=size,
        dominant_colors=attributes.dominant_colors,
        visual_features=attributes.visual_features
    )

    return CatalogItem(
        product_name=p_name,
        category=cat,
        sector=sec,
        material=mat,
        product_size=size,
        description=description,
        visual_features=attributes.visual_features,
        dominant_colors=attributes.dominant_colors,
        attribute_confidence=attributes.confidence,
        status="catalog generated successfully"
    )
