import io
import os
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_tests():
    print("--- 1. Testing Health Endpoints ---")
    res1 = client.get("/artisan")
    assert res1.status_code == 200, f"Expected 200, got {res1.status_code}"
    print(f"GET /artisan -> {res1.status_code} {res1.json()}")

    res2 = client.get("/health")
    assert res2.status_code == 200, f"Expected 200, got {res2.status_code}"
    print(f"GET /health -> {res2.status_code} {res2.json()}")

    print("\n--- 2. Testing Valid JPEG Upload ---")
    img_buf = io.BytesIO()
    img = Image.new("RGB", (800, 600), color="red")
    img.save(img_buf, format="JPEG")
    img_buf.seek(0)

    res_jpg = client.post(
        "/api/v1/image/upload",
        files={"file": ("basket.jpg", img_buf, "image/jpeg")}
    )
    print(f"POST /api/v1/image/upload (JPEG) -> {res_jpg.status_code} {res_jpg.json()}")
    assert res_jpg.status_code == 201
    data = res_jpg.json()
    assert data["filename"] == "basket.jpg"
    assert data["format"] == "JPEG"
    assert data["width"] == 800
    assert data["height"] == 600
    assert data["status"] == "uploaded successfully"

    print("\n--- 3. Testing Valid PNG Upload ---")
    img_buf_png = io.BytesIO()
    img_png = Image.new("RGBA", (400, 300), color="blue")
    img_png.save(img_buf_png, format="PNG")
    img_buf_png.seek(0)

    res_png = client.post(
        "/api/v1/image/upload",
        files={"file": ("pottery.png", img_buf_png, "image/png")}
    )
    print(f"POST /api/v1/image/upload (PNG) -> {res_png.status_code} {res_png.json()}")
    assert res_png.status_code == 201
    assert res_png.json()["format"] == "PNG"

    print("\n--- 4. Testing Valid WEBP Upload ---")
    img_buf_webp = io.BytesIO()
    img_webp = Image.new("RGB", (200, 200), color="green")
    img_webp.save(img_buf_webp, format="WEBP")
    img_buf_webp.seek(0)

    res_webp = client.post(
        "/api/v1/image/upload",
        files={"file": ("textile.webp", img_buf_webp, "image/webp")}
    )
    print(f"POST /api/v1/image/upload (WEBP) -> {res_webp.status_code} {res_webp.json()}")
    assert res_webp.status_code == 201
    assert res_webp.json()["format"] == "WEBP"

    print("\n--- 5. Testing Unsupported File Type (.txt) ---")
    res_txt = client.post(
        "/api/v1/image/upload",
        files={"file": ("notes.txt", b"Hello world text file", "text/plain")}
    )
    print(f"POST /api/v1/image/upload (TXT) -> {res_txt.status_code} {res_txt.json()}")
    assert res_txt.status_code == 400

    print("\n--- 6. Testing Corrupted Image Data ---")
    res_corrupt = client.post(
        "/api/v1/image/upload",
        files={"file": ("fake.jpg", b"NOT AN IMAGE DATA", "image/jpeg")}
    )
    print(f"POST /api/v1/image/upload (Corrupt) -> {res_corrupt.status_code} {res_corrupt.json()}")
    assert res_corrupt.status_code == 400

    print("\n[SUCCESS] ALL PHASE 1 TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
