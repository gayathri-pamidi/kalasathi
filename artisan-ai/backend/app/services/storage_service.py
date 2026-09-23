import os
import uuid
from app.config import config


def get_storage_directory() -> str:
    """Return absolute storage directory path and ensure it exists."""
    storage_path = os.path.abspath(config.STORAGE_PATH)
    os.makedirs(storage_path, exist_ok=True)
    return storage_path


def save_image_file(file_bytes: bytes, original_filename: str) -> str:
    """
    Saves original image binary bytes to the storage directory.
    Returns the absolute saved file path.
    """
    try:
        storage_dir = get_storage_directory()
        unique_name = f"{uuid.uuid4().hex}_{original_filename}"
        file_path = os.path.join(storage_dir, unique_name)

        with open(file_path, "wb") as f:
            f.write(file_bytes)

        return file_path
    except Exception as e:
        raise RuntimeError(f"Failed to save file to storage: {str(e)}")


def save_processed_image_file(file_bytes: bytes, original_filename: str) -> tuple[str, str]:
    """
    Saves processed image binary bytes to storage without overwriting original file.
    Returns a tuple of (absolute_file_path, processed_filename).
    """
    try:
        storage_dir = get_storage_directory()
        name_part, ext_part = os.path.splitext(original_filename)
        processed_display_name = f"{name_part}_processed{ext_part}"

        unique_name = f"{uuid.uuid4().hex}_{processed_display_name}"
        file_path = os.path.join(storage_dir, unique_name)

        with open(file_path, "wb") as f:
            f.write(file_bytes)

        return file_path, processed_display_name
    except Exception as e:
        raise RuntimeError(f"Failed to save processed file to storage: {str(e)}")


def save_transparent_image_file(file_bytes: bytes, original_filename: str) -> tuple[str, str]:
    """
    Saves transparent background-removed PNG image bytes to storage without overwriting original file.
    Returns a tuple of (absolute_file_path, transparent_output_filename).
    """
    try:
        storage_dir = get_storage_directory()
        name_part = os.path.splitext(original_filename)[0]
        output_display_name = f"{name_part}_no_bg.png"

        unique_name = f"{uuid.uuid4().hex}_{output_display_name}"
        file_path = os.path.join(storage_dir, unique_name)

        with open(file_path, "wb") as f:
            f.write(file_bytes)

        return file_path, output_display_name
    except Exception as e:
        raise RuntimeError(f"Failed to save transparent image to storage: {str(e)}")


def save_enhanced_image_file(file_bytes: bytes, original_filename: str) -> tuple[str, str]:
    """
    Saves AI super-resolved enhanced PNG image bytes to storage without overwriting original file.
    Returns a tuple of (absolute_file_path, enhanced_output_filename).
    """
    try:
        storage_dir = get_storage_directory()
        name_part = os.path.splitext(original_filename)[0]
        output_display_name = f"{name_part}_enhanced.png"

        unique_name = f"{uuid.uuid4().hex}_{output_display_name}"
        file_path = os.path.join(storage_dir, unique_name)

        with open(file_path, "wb") as f:
            f.write(file_bytes)

        return file_path, output_display_name
    except Exception as e:
        raise RuntimeError(f"Failed to save enhanced image to storage: {str(e)}")
