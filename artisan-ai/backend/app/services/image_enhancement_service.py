import io
import os
import urllib.request
from typing import Optional, Tuple
from fastapi import UploadFile, HTTPException, status
from PIL import Image, UnidentifiedImageError, ImageFilter, ImageDraw
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import rembg

from app.config import config
from app.schemas.image_schemas import ImageEnhancementResponse
from app.services.storage_service import save_image_file, save_enhanced_image_file
from app.services.background_removal_service import get_rembg_session

ALLOWED_MIME_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
MODEL_URL = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.1/RealESRGAN_x2plus.pth"
STUDIO_NEUTRAL_BG_COLOR = (248, 248, 248, 255)  # Clean off-white e-commerce catalog background


def create_subtle_grounding_shadow(alpha_mask: Image.Image, width: int, height: int) -> Image.Image:
    """
    Creates a soft, minimal contact shadow at the base of the product foreground for natural studio grounding.
    """
    shadow_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    bbox = alpha_mask.getbbox()
    if not bbox:
        return shadow_layer

    left, top, right, bottom = bbox
    prod_w = right - left
    prod_h = bottom - top

    shadow_w = int(prod_w * 0.85)
    shadow_h = max(4, int(prod_h * 0.08))
    cx = (left + right) // 2
    cy = bottom - int(shadow_h * 0.25)

    shadow_box = (
        max(0, cx - shadow_w // 2),
        max(0, cy - shadow_h // 2),
        min(width, cx + shadow_w // 2),
        min(height, cy + shadow_h // 2)
    )

    if shadow_box[2] > shadow_box[0] and shadow_box[3] > shadow_box[1]:
        shadow_draw = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(shadow_draw)
        # Soft dark oval with ~18% opacity (45 out of 255)
        draw.ellipse(shadow_box, fill=(25, 25, 25, 45))
        blur_radius = max(3, int(shadow_h * 0.6))
        shadow_layer = shadow_draw.filter(ImageFilter.GaussianBlur(radius=blur_radius))

    return shadow_layer


# --- PyTorch Real-ESRGAN x2 Network Architecture ---

class ResidualDenseBlock_5C(nn.Module):
    def __init__(self, nf: int = 64, gc: int = 32):
        super().__init__()
        self.conv1 = nn.Conv2d(nf, gc, 3, 1, 1)
        self.conv2 = nn.Conv2d(nf + gc, gc, 3, 1, 1)
        self.conv3 = nn.Conv2d(nf + 2 * gc, gc, 3, 1, 1)
        self.conv4 = nn.Conv2d(nf + 3 * gc, gc, 3, 1, 1)
        self.conv5 = nn.Conv2d(nf + 4 * gc, nf, 3, 1, 1)
        self.lrelu = nn.LeakyReLU(negative_slope=0.2, inplace=True)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x1 = self.lrelu(self.conv1(x))
        x2 = self.lrelu(self.conv2(torch.cat((x, x1), 1)))
        x3 = self.lrelu(self.conv3(torch.cat((x, x1, x2), 1)))
        x4 = self.lrelu(self.conv4(torch.cat((x, x1, x2, x3), 1)))
        x5 = self.conv5(torch.cat((x, x1, x2, x3, x4), 1))
        return x5 * 0.2 + x


class RRDB(nn.Module):
    def __init__(self, nf: int = 64, gc: int = 32):
        super().__init__()
        self.rdb1 = ResidualDenseBlock_5C(nf, gc)
        self.rdb2 = ResidualDenseBlock_5C(nf, gc)
        self.rdb3 = ResidualDenseBlock_5C(nf, gc)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out = self.rdb1(x)
        out = self.rdb2(out)
        out = self.rdb3(out)
        return out * 0.2 + x


class RRDBNet(nn.Module):
    """
    Real-ESRGAN x2 Architecture:
    1. Pixel Unshuffle (scale=2): Downsamples input (H, W) by 2 into 12 channels at (H/2, W/2).
    2. RRDB Trunk: Processes features at (H/2, W/2).
    3. Stage 1 Upsampling (conv_up1 + nearest 2x): (H/2, W/2) -> (H, W).
    4. Stage 2 Upsampling (conv_up2 + nearest 2x): (H, W) -> (2H, 2W).
    Net Spatial Scale Factor: 1/2 * 2 * 2 = 2 (exactly 2x resolution increase).
    """
    def __init__(self, in_nc: int = 12, out_nc: int = 3, nf: int = 64, nb: int = 23, gc: int = 32, scale: int = 2):
        super().__init__()
        self.scale = scale
        self.conv_first = nn.Conv2d(in_nc, nf, 3, 1, 1)
        self.body = nn.Sequential(*[RRDB(nf=nf, gc=gc) for _ in range(nb)])
        self.conv_body = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_up1 = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_up2 = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_hr = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_last = nn.Conv2d(nf, out_nc, 3, 1, 1)
        self.lrelu = nn.LeakyReLU(negative_slope=0.2, inplace=True)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        feat = F.pixel_unshuffle(x, 2)
        fea = self.conv_first(feat)
        trunk = self.conv_body(self.body(fea))
        fea = fea + trunk
        fea = self.lrelu(self.conv_up1(F.interpolate(fea, scale_factor=2, mode="nearest")))
        fea = self.lrelu(self.conv_up2(F.interpolate(fea, scale_factor=2, mode="nearest")))
        out = self.conv_last(self.lrelu(self.conv_hr(fea)))
        return out


# Singleton Model Cache Instance
_enhancement_model: Optional[RRDBNet] = None


def get_model_cache_path() -> str:
    """Returns local path to cached model weights file."""
    cache_dir = os.path.expanduser("~/.cache/realesrgan")
    os.makedirs(cache_dir, exist_ok=True)
    return os.path.join(cache_dir, "RealESRGAN_x2plus.pth")


def get_realesrgan_model() -> RRDBNet:
    """Loads and caches the Real-ESRGAN x2 PyTorch model singleton."""
    global _enhancement_model
    if _enhancement_model is None:
        model_path = get_model_cache_path()

        # Download checkpoint if not cached locally
        if not os.path.exists(model_path):
            try:
                urllib.request.urlretrieve(MODEL_URL, model_path)
            except Exception as e:
                raise RuntimeError(f"Failed to download Real-ESRGAN weights from {MODEL_URL}: {str(e)}")

        try:
            model = RRDBNet(in_nc=12, out_nc=3, nf=64, nb=23, gc=32, scale=2)
            checkpoint = torch.load(model_path, map_location="cpu")
            state_dict_key = "params_ema" if "params_ema" in checkpoint else "params"
            # Strict verification of state dict keys against RRDBNet architecture
            res = model.load_state_dict(checkpoint[state_dict_key], strict=True)
            if res.missing_keys or res.unexpected_keys:
                raise RuntimeError(f"State dict mismatch: missing={res.missing_keys}, unexpected={res.unexpected_keys}")
            model.eval()
            _enhancement_model = model
        except Exception as e:
            raise RuntimeError(f"Failed to initialize Real-ESRGAN model: {str(e)}")

    return _enhancement_model


async def enhance_product_image_pipeline(file: UploadFile) -> Tuple[bytes, ImageEnhancementResponse]:
    """
    E-Commerce Catalog Product Photo Enhancement Pipeline:
    1. Validate image format & integrity.
    2. Correct EXIF camera orientation (ImageOps.exif_transpose).
    3. Proportional working resize: Automatically scale down large mobile/camera photos
       (e.g., 1200x1600, 2000x3000, 4032x3024) to safe internal model working resolution
       (max 1024px longest edge) while strictly preserving aspect ratio.
    4. Segment product foreground using U2-Net AI model (rembg).
    5. Generate soft natural contact shadow at base of product.
    6. Composite product onto clean studio neutral off-white background (RGB 248, 248, 248).
    7. Controlled texture sharpening for moderately blurry photos.
    8. Upscale spatial resolution by 2x using Real-ESRGAN x2 PyTorch super-resolution model.
    9. Save outputs and return catalog-ready 2x PNG image bytes.
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

    # 2. Read file data
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

    # 3. Verify image integrity with Pillow & Correct EXIF Orientation
    try:
        from PIL import ImageOps
        pil_image = Image.open(io.BytesIO(file_bytes))
        detected_format = pil_image.format
        pil_image.verify()
        pil_image = Image.open(io.BytesIO(file_bytes))
        detected_format = detected_format or pil_image.format
        pil_image = ImageOps.exif_transpose(pil_image)
    except (UnidentifiedImageError, OSError, Exception):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or corrupted image file."
        )

    img_format = (detected_format or pil_image.format or "").upper()
    if not img_format and file.content_type:
        ct = file.content_type.lower()
        if "jpeg" in ct or "jpg" in ct:
            img_format = "JPEG"
        elif "png" in ct:
            img_format = "PNG"
        elif "webp" in ct:
            img_format = "WEBP"

    if img_format not in ALLOWED_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image format '{img_format}'. Supported formats: JPEG, PNG, WEBP."
        )

    orig_w, orig_h = pil_image.size

    # Safety check against decompression bomb attacks (>100 Megapixels)
    if orig_w * orig_h > 100_000_000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image dimensions exceed maximum allowable safety limit of 100 megapixels."
        )

    # 4. Automatic Proportional Resizing for Model Safe Working Resolution
    max_dim = config.ENHANCEMENT_MAX_INPUT_DIMENSION  # Internal safe working resolution (1024px)
    if max(orig_w, orig_h) > max_dim:
        scale = max_dim / float(max(orig_w, orig_h))
        work_w = int(round(orig_w * scale))
        work_h = int(round(orig_h * scale))
        working_pil = pil_image.resize((work_w, work_h), Image.Resampling.LANCZOS)
    else:
        work_w, work_h = orig_w, orig_h
        working_pil = pil_image

    # Check for RGBA Alpha Channel Transparency in original input
    has_alpha = pil_image.mode in ("RGBA", "LA") or (
        pil_image.mode == "P" and "transparency" in pil_image.info
    )

    # Re-encode working image bytes for rembg segmentation
    work_buf = io.BytesIO()
    work_fmt = "PNG" if has_alpha else ("JPEG" if img_format in ("JPEG", "JPG") else "PNG")
    working_pil.save(work_buf, format=work_fmt)
    work_bytes = work_buf.getvalue()

    # 5. U2-Net AI Background Removal & Clean Studio Neutral Off-White Compositing
    try:
        session = get_rembg_session()
        # Extract product foreground mask with U2-Net model
        transparent_bytes = rembg.remove(work_bytes, session=session)
        fg_image = Image.open(io.BytesIO(transparent_bytes)).convert("RGBA")
    except Exception:
        # Fallback to working image converted to RGBA if rembg segmentation fails
        fg_image = working_pil.convert("RGBA")

    # Extract product foreground alpha mask
    alpha_mask = fg_image.getchannel("A")

    # Generate soft contact shadow below product bottom
    shadow_layer = create_subtle_grounding_shadow(alpha_mask, work_w, work_h)

    # Studio neutral off-white background RGB(248, 248, 248)
    catalog_bg = Image.new("RGBA", (work_w, work_h), STUDIO_NEUTRAL_BG_COLOR)

    # Composite: Grounding Shadow -> Product Foreground over Clean Off-White Background
    catalog_bg = Image.alpha_composite(catalog_bg, shadow_layer)
    catalog_bg = Image.alpha_composite(catalog_bg, fg_image)

    # Convert catalog composition to RGB for Real-ESRGAN super-resolution
    rgb_image = catalog_bg.convert("RGB")

    # Controlled texture sharpening for moderately blurry artisan photos
    rgb_image = rgb_image.filter(ImageFilter.UnsharpMask(radius=1.0, percent=60, threshold=3))

    # 6. Execute Real-ESRGAN x2 AI Model Inference
    try:
        model = get_realesrgan_model()
        rgb_np = np.array(rgb_image, dtype=np.float32) / 255.0
        # HWC -> CHW Tensor
        input_tensor = torch.from_numpy(rgb_np.transpose(2, 0, 1)).unsqueeze(0).float()

        _, _, h, w = input_tensor.shape
        pad_h = (2 - (h % 2)) % 2
        pad_w = (2 - (w % 2)) % 2

        if pad_h > 0 or pad_w > 0:
            # Pad bottom and/or right edge via replicate mode to ensure h % 2 == 0 and w % 2 == 0
            input_tensor = F.pad(input_tensor, (0, pad_w, 0, pad_h), mode="replicate")

        with torch.no_grad():
            output_tensor = model(input_tensor)

        if pad_h > 0 or pad_w > 0:
            # Crop off the 2x scaled padded regions from bottom and right
            unpad_h = h * config.ENHANCEMENT_MODEL_SCALE
            unpad_w = w * config.ENHANCEMENT_MODEL_SCALE
            output_tensor = output_tensor[:, :, :unpad_h, :unpad_w]

        # CHW -> HWC NumPy Array
        out_np = output_tensor.squeeze(0).clamp(0.0, 1.0).cpu().numpy().transpose(1, 2, 0)
        enhanced_rgb_np = (out_np * 255.0).round().astype(np.uint8)
        enhanced_rgb_pil = Image.fromarray(enhanced_rgb_np, mode="RGB")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI super-resolution inference failed: {str(e)}"
        )

    enhanced_w, enhanced_h = enhanced_rgb_pil.size

    # Verify 2x spatial output dimensions matching neural network output on working image
    expected_w = work_w * config.ENHANCEMENT_MODEL_SCALE
    expected_h = work_h * config.ENHANCEMENT_MODEL_SCALE
    if enhanced_w != expected_w or enhanced_h != expected_h:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Output dimension mismatch: expected {expected_w}x{expected_h}, got {enhanced_w}x{enhanced_h}."
        )

    # Convert final enhanced image to RGBA format for universal transparency/PNG compatibility
    if has_alpha and alpha_mask is not None:
        resized_alpha = alpha_mask.resize((enhanced_w, enhanced_h), Image.Resampling.LANCZOS)
        enhanced_final_pil = Image.merge("RGBA", (*enhanced_rgb_pil.split(), resized_alpha))
    else:
        enhanced_final_pil = enhanced_rgb_pil.convert("RGBA")

    # 7. Encode PNG output bytes
    out_buf = io.BytesIO()
    enhanced_final_pil.save(out_buf, format="PNG")
    enhanced_bytes = out_buf.getvalue()

    # 8. Save original image and enhanced image via storage_service
    try:
        save_image_file(file_bytes, file.filename)
        _, output_filename = save_enhanced_image_file(enhanced_bytes, file.filename)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Storage failure: {str(e)}"
        )

    # 9. Return tuple of (enhanced_bytes, structured response)
    response_schema = ImageEnhancementResponse(
        original_filename=file.filename,
        output_filename=output_filename,
        output_format="PNG",
        original_width=orig_w,
        original_height=orig_h,
        enhanced_width=enhanced_w,
        enhanced_height=enhanced_h,
        scale_factor=config.ENHANCEMENT_MODEL_SCALE,
        status="image enhanced successfully"
    )
    return enhanced_bytes, response_schema



async def enhance_product_image(file: UploadFile) -> ImageEnhancementResponse:
    """
    Phase 4: AI Product Super-Resolution & Image Enhancement (JSON response endpoint).
    """
    _, response = await enhance_product_image_pipeline(file)
    return response


async def enhance_product_image_raw(file: UploadFile) -> bytes:
    """
    Phase 4: AI Product Super-Resolution & Image Enhancement (Direct PNG binary bytes endpoint).
    """
    enhanced_bytes, _ = await enhance_product_image_pipeline(file)
    return enhanced_bytes

