import io
import os
import time
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def run_tests():
    print("--- 1. Testing Health Endpoint ---")
    res_health = client.get("/health")
    assert res_health.status_code == 200
    print(f"GET /health -> {res_health.status_code} {res_health.json()}")

    print("\n--- 2. Testing JPEG Artisan Product Image Analysis ---")
    img_buf_jpeg = io.BytesIO()
    img_jpeg = Image.new("RGB", (250, 250), color=(139, 69, 19))  # Brown clay pot simulation
    # Add an inner circle with terracotta orange color
    for x in range(75, 175):
        for y in range(75, 175):
            img_jpeg.putpixel((x, y), (255, 140, 0))
    img_jpeg.save(img_buf_jpeg, format="JPEG")
    img_buf_jpeg.seek(0)

    t0 = time.time()
    res_ana_jpeg = client.post(
        "/api/v1/image/analyze",
        files={"file": ("terracotta_vase.jpg", img_buf_jpeg, "image/jpeg")}
    )
    t1 = time.time()
    assert res_ana_jpeg.status_code == 200, f"Failed: {res_ana_jpeg.text}"
    data_jpeg = res_ana_jpeg.json()
    print(f"POST /api/v1/image/analyze (JPEG) -> {res_ana_jpeg.status_code} {data_jpeg}")
    print(f"  [Performance] Analysis Time: {t1 - t0:.3f}s")

    assert data_jpeg["original_filename"] == "terracotta_vase.jpg"
    assert data_jpeg["status"] == "image analysis completed successfully"
    analysis = data_jpeg["analysis"]

    assert analysis["product_category"] is not None
    assert analysis["product_type"] is not None
    assert 0.0 <= analysis["category_confidence"] <= 1.0
    assert 0.0 <= analysis["material_confidence"] <= 1.0

    dom_colors = analysis["dominant_colors"]
    assert len(dom_colors) > 0
    total_pct = sum(c["percentage"] for c in dom_colors)
    print(f"  Dominant Colors Extracted: {dom_colors} (Sum: {total_pct}%)")
    assert 95.0 <= total_pct <= 105.0

    iq = analysis["image_quality"]
    assert 0.0 <= iq["brightness"] <= 1.0
    assert 0.0 <= iq["contrast"] <= 1.0
    assert 0.0 <= iq["sharpness"] <= 1.0
    print(f"  Image Quality Metrics: {iq}")

    print("\n--- 3. Testing PNG Product Image Analysis ---")
    img_buf_png = io.BytesIO()
    img_png = Image.new("RGB", (200, 300), color=(0, 128, 128))  # Teal woodcraft simulation
    img_png.save(img_buf_png, format="PNG")
    img_buf_png.seek(0)

    res_ana_png = client.post(
        "/api/v1/image/analyze",
        files={"file": ("bamboo_sculpture.png", img_buf_png, "image/png")}
    )
    assert res_ana_png.status_code == 200
    data_png = res_ana_png.json()
    print(f"POST /api/v1/image/analyze (PNG) -> {res_ana_png.status_code} {data_png['analysis']['product_category']}")
    assert data_png["analysis"]["product_category"] is not None

    print("\n--- 4. Testing WEBP Product Image Analysis ---")
    img_buf_webp = io.BytesIO()
    img_webp = Image.new("RGB", (300, 200), color=(128, 0, 128))  # Purple silk saree simulation
    img_webp.save(img_buf_webp, format="WEBP")
    img_buf_webp.seek(0)

    res_ana_webp = client.post(
        "/api/v1/image/analyze",
        files={"file": ("silk_saree.webp", img_buf_webp, "image/webp")}
    )
    assert res_ana_webp.status_code == 200
    data_webp = res_ana_webp.json()
    print(f"POST /api/v1/image/analyze (WEBP) -> {res_ana_webp.status_code} {data_webp['analysis']['product_category']}")

    print("\n--- 5. Testing Transparent PNG Analysis (Alpha Foreground Awareness) ---")
    # Transparent PNG: transparent background (alpha=0), orange solid square in center (alpha=255)
    img_rgba = Image.new("RGBA", (200, 200), (0, 0, 0, 0))
    for x in range(50, 150):
        for y in range(50, 150):
            img_rgba.putpixel((x, y), (255, 140, 0, 255))
    img_buf_rgba = io.BytesIO()
    img_rgba.save(img_buf_rgba, format="PNG")
    img_buf_rgba.seek(0)

    res_ana_rgba = client.post(
        "/api/v1/image/analyze",
        files={"file": ("clay_pot_no_bg.png", img_buf_rgba, "image/png")}
    )
    assert res_ana_rgba.status_code == 200
    data_rgba = res_ana_rgba.json()
    print(f"POST /api/v1/image/analyze (Transparent PNG) -> {res_ana_rgba.status_code}")
    print(f"  Visual Descriptors: {data_rgba['analysis']['visual_features']}")
    print(f"  Foreground Dominant Colors: {data_rgba['analysis']['dominant_colors']}")

    # Verify transparent pixels were ignored and foreground color (orange) was identified
    fg_color_names = [c["name"] for c in data_rgba["analysis"]["dominant_colors"]]
    assert "orange" in fg_color_names or "tan" in fg_color_names or "brown" in fg_color_names
    assert "black" not in fg_color_names, "Transparent background (alpha=0) was incorrectly included in dominant colors!"

    print("\n--- 6. Testing Invalid File Type (.txt) ---")
    res_txt = client.post(
        "/api/v1/image/analyze",
        files={"file": ("notes.txt", b"Invalid text data", "text/plain")}
    )
    assert res_txt.status_code == 400
    print(f"POST /api/v1/image/analyze (TXT) -> {res_txt.status_code} {res_txt.json()}")

    print("\n--- 7. Testing Corrupted Image Data ---")
    res_corrupt = client.post(
        "/api/v1/image/analyze",
        files={"file": ("corrupt.jpg", b"NOT AN IMAGE DATA", "image/jpeg")}
    )
    assert res_corrupt.status_code == 400
    print(f"POST /api/v1/image/analyze (Corrupt) -> {res_corrupt.status_code} {res_corrupt.json()}")

    print("\n--- 8. Testing Model Cache Reuse ---")
    t_start = time.time()
    res_fast = client.post(
        "/api/v1/image/analyze",
        files={"file": ("reuse_test.jpg", img_buf_jpeg, "image/jpeg")}
    )
    t_end = time.time()
    assert res_fast.status_code == 200
    print(f"Cached Model Analysis Execution Time: {t_end - t_start:.3f}s")

    print("\n[SUCCESS] ALL PHASE 5 IMAGE ANALYSIS TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    run_tests()
