import io
import os
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app
from app.services.storage_service import get_storage_directory

client = TestClient(app)

def run_tests():
    storage_dir = get_storage_directory()

    print("--- 1. Testing Existing Health Endpoint ---")
    res_health = client.get("/health")
    assert res_health.status_code == 200
    print(f"GET /health -> {res_health.status_code} {res_health.json()}")

    print("\n--- 2. Testing Existing Upload Endpoint (Phase 1) ---")
    img_buf = io.BytesIO()
    img = Image.new("RGB", (600, 400), color="red")
    img.save(img_buf, format="JPEG")
    img_buf.seek(0)
    res_up = client.post("/api/v1/image/upload", files={"file": ("upload_test.jpg", img_buf, "image/jpeg")})
    assert res_up.status_code == 201
    print(f"POST /api/v1/image/upload -> {res_up.status_code} {res_up.json()}")

    print("\n--- 3. Testing JPEG Image Processing (Phase 2) ---")
    img_buf_jpeg = io.BytesIO()
    img_jpeg = Image.new("RGB", (1200, 800), color="sandybrown")
    img_jpeg.save(img_buf_jpeg, format="JPEG")
    img_buf_jpeg.seek(0)

    res_proc_jpeg = client.post("/api/v1/image/process", files={"file": ("basket.jpg", img_buf_jpeg, "image/jpeg")})
    assert res_proc_jpeg.status_code == 200, f"Failed: {res_proc_jpeg.text}"
    data_jpeg = res_proc_jpeg.json()
    print(f"POST /api/v1/image/process (JPEG) -> {res_proc_jpeg.status_code} {data_jpeg}")
    assert data_jpeg["original_filename"] == "basket.jpg"
    assert data_jpeg["processed_filename"] == "basket_processed.jpg"
    assert data_jpeg["original_width"] == 1200
    assert data_jpeg["original_height"] == 800
    assert data_jpeg["processed_width"] == 1200
    assert data_jpeg["processed_height"] == 800
    assert data_jpeg["status"] == "processed successfully"

    print("\n--- 4. Testing PNG Image Processing (Phase 2) ---")
    img_buf_png = io.BytesIO()
    img_png = Image.new("RGB", (500, 500), color="teal")
    img_png.save(img_buf_png, format="PNG")
    img_buf_png.seek(0)

    res_proc_png = client.post("/api/v1/image/process", files={"file": ("pottery.png", img_buf_png, "image/png")})
    assert res_proc_png.status_code == 200
    data_png = res_proc_png.json()
    print(f"POST /api/v1/image/process (PNG) -> {res_proc_png.status_code} {data_png}")
    assert data_png["processed_filename"] == "pottery_processed.png"

    print("\n--- 5. Testing WEBP Image Processing (Phase 2) ---")
    img_buf_webp = io.BytesIO()
    img_webp = Image.new("RGB", (400, 400), color="purple")
    img_webp.save(img_buf_webp, format="WEBP")
    img_buf_webp.seek(0)

    res_proc_webp = client.post("/api/v1/image/process", files={"file": ("rug.webp", img_buf_webp, "image/webp")})
    assert res_proc_webp.status_code == 200
    data_webp = res_proc_webp.json()
    print(f"POST /api/v1/image/process (WEBP) -> {res_proc_webp.status_code} {data_webp}")
    assert data_webp["processed_filename"] == "rug_processed.webp"

    print("\n--- 6. Testing Large Image Resizing (>1920px) ---")
    img_buf_large = io.BytesIO()
    img_large = Image.new("RGB", (3000, 2000), color="darkorange")
    img_large.save(img_buf_large, format="JPEG")
    img_buf_large.seek(0)

    res_large = client.post("/api/v1/image/process", files={"file": ("large_carpet.jpg", img_buf_large, "image/jpeg")})
    assert res_large.status_code == 200
    data_large = res_large.json()
    print(f"POST /api/v1/image/process (Large 3000x2000) -> {res_large.status_code} {data_large}")
    assert data_large["original_width"] == 3000
    assert data_large["original_height"] == 2000
    assert data_large["processed_width"] == 1920
    assert data_large["processed_height"] == 1280

    print("\n--- 7. Testing Invalid File Type (.txt) ---")
    res_txt = client.post("/api/v1/image/process", files={"file": ("notes.txt", b"Hello text", "text/plain")})
    assert res_txt.status_code == 400
    print(f"POST /api/v1/image/process (TXT) -> {res_txt.status_code} {res_txt.json()}")

    print("\n--- 8. Testing Corrupted Image Data ---")
    res_corrupt = client.post("/api/v1/image/process", files={"file": ("corrupt.jpg", b"INVALID BINARY DATA", "image/jpeg")})
    assert res_corrupt.status_code == 400
    print(f"POST /api/v1/image/process (Corrupt) -> {res_corrupt.status_code} {res_corrupt.json()}")

    print("\n--- 9. Verifying File Existence on Disk & Openability ---")
    saved_files = os.listdir(storage_dir)
    print(f"Storage Directory Files Count: {len(saved_files)}")
    assert len(saved_files) > 0

    processed_files = [f for f in saved_files if "_processed" in f]
    print(f"Found {len(processed_files)} processed files on disk: {processed_files}")
    assert len(processed_files) >= 4

    for proc_file in processed_files:
        full_path = os.path.join(storage_dir, proc_file)
        assert os.path.exists(full_path), f"File {full_path} does not exist!"
        # Verify file can actually be opened by Pillow
        opened_img = Image.open(full_path)
        opened_img.verify()
        print(f"  [OK] Successfully opened & verified disk file: {proc_file} ({opened_img.format}, {opened_img.size})")

    print("\n[SUCCESS] ALL PHASE 1 AND PHASE 2 TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
