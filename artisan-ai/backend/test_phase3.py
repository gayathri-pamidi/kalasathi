import io
import os
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app
from app.services.storage_service import get_storage_directory

client = TestClient(app)

def run_tests():
    storage_dir = get_storage_directory()

    print("--- 1. Testing Health Endpoint ---")
    res_health = client.get("/health")
    assert res_health.status_code == 200
    print(f"GET /health -> {res_health.status_code} {res_health.json()}")

    print("\n--- 2. Testing JPEG AI Background Removal ---")
    img_buf_jpeg = io.BytesIO()
    # Create a test image with a distinct red square subject on white background
    img_jpeg = Image.new("RGB", (300, 300), color="white")
    for x in range(80, 220):
        for y in range(80, 220):
            img_jpeg.putpixel((x, y), (255, 0, 0))
    img_jpeg.save(img_buf_jpeg, format="JPEG")
    img_buf_jpeg.seek(0)

    res_bg_jpeg = client.post("/api/v1/image/remove-background", files={"file": ("clay_pot.jpg", img_buf_jpeg, "image/jpeg")})
    assert res_bg_jpeg.status_code == 200, f"Failed: {res_bg_jpeg.text}"
    data_jpeg = res_bg_jpeg.json()
    print(f"POST /api/v1/image/remove-background (JPEG) -> {res_bg_jpeg.status_code} {data_jpeg}")
    assert data_jpeg["original_filename"] == "clay_pot.jpg"
    assert data_jpeg["output_filename"] == "clay_pot_no_bg.png"
    assert data_jpeg["output_format"] == "PNG"
    assert data_jpeg["has_transparency"] is True
    assert data_jpeg["status"] == "background removed successfully"

    print("\n--- 3. Testing PNG AI Background Removal ---")
    img_buf_png = io.BytesIO()
    img_png = Image.new("RGB", (250, 250), color="white")
    for x in range(60, 190):
        for y in range(60, 190):
            img_png.putpixel((x, y), (0, 128, 255))
    img_png.save(img_buf_png, format="PNG")
    img_buf_png.seek(0)

    res_bg_png = client.post("/api/v1/image/remove-background", files={"file": ("wood_craft.png", img_buf_png, "image/png")})
    assert res_bg_png.status_code == 200
    data_png = res_bg_png.json()
    print(f"POST /api/v1/image/remove-background (PNG) -> {res_bg_png.status_code} {data_png}")
    assert data_png["output_filename"] == "wood_craft_no_bg.png"
    assert data_png["has_transparency"] is True

    print("\n--- 4. Testing WEBP AI Background Removal ---")
    img_buf_webp = io.BytesIO()
    img_webp = Image.new("RGB", (200, 200), color="white")
    for x in range(50, 150):
        for y in range(50, 150):
            img_webp.putpixel((x, y), (34, 139, 34))
    img_webp.save(img_buf_webp, format="WEBP")
    img_buf_webp.seek(0)

    res_bg_webp = client.post("/api/v1/image/remove-background", files={"file": ("silk_saree.webp", img_buf_webp, "image/webp")})
    assert res_bg_webp.status_code == 200
    data_webp = res_bg_webp.json()
    print(f"POST /api/v1/image/remove-background (WEBP) -> {res_bg_webp.status_code} {data_webp}")
    assert data_webp["output_filename"] == "silk_saree_no_bg.png"
    assert data_webp["has_transparency"] is True

    print("\n--- 5. Testing Invalid File Type (.txt) ---")
    res_txt = client.post("/api/v1/image/remove-background", files={"file": ("notes.txt", b"Hello text file", "text/plain")})
    assert res_txt.status_code == 400
    print(f"POST /api/v1/image/remove-background (TXT) -> {res_txt.status_code} {res_txt.json()}")

    print("\n--- 6. Testing Corrupted Image Data ---")
    res_corrupt = client.post("/api/v1/image/remove-background", files={"file": ("corrupt.jpg", b"INVALID BINARY DATA", "image/jpeg")})
    assert res_corrupt.status_code == 400
    print(f"POST /api/v1/image/remove-background (Corrupt) -> {res_corrupt.status_code} {res_corrupt.json()}")

    print("\n--- 7. Verifying Real Alpha Transparency & Disk Persistence ---")
    saved_files = os.listdir(storage_dir)
    print(f"Total files in storage directory: {len(saved_files)}")

    no_bg_files = [f for f in saved_files if "_no_bg.png" in f]
    print(f"Found {len(no_bg_files)} background-removed files on disk: {no_bg_files}")
    assert len(no_bg_files) >= 3

    for no_bg_file in no_bg_files:
        full_path = os.path.join(storage_dir, no_bg_file)
        assert os.path.exists(full_path), f"File {full_path} missing!"

        # 1. Open with Pillow
        opened_img = Image.open(full_path)
        opened_img.verify()
        opened_img = Image.open(full_path)  # re-open after verify

        # 2. Verify image.mode == "RGBA"
        assert opened_img.mode == "RGBA", f"Image mode is '{opened_img.mode}', expected 'RGBA'"

        # 3. Extract alpha channel
        alpha_channel = opened_img.getchannel("A")
        min_alpha, max_alpha = alpha_channel.getextrema()

        # 4 & 5. Verify presence of both transparent (alpha < 255) and opaque (alpha > 0) pixels
        assert min_alpha < 255, f"File {no_bg_file} has no transparent pixels (min alpha = {min_alpha})"
        assert max_alpha > 0, f"File {no_bg_file} has no opaque foreground pixels (max alpha = {max_alpha})"

        print(f"  [OK] REAL Alpha Transparency Verified: {no_bg_file} | Mode: {opened_img.mode} | Alpha Range: [{min_alpha}, {max_alpha}]")

    print("\n[SUCCESS] STRENGTHENED PHASE 3 TRANSPARENCY VERIFICATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
