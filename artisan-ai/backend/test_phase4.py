import io
import os
import time
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

    print("\n--- 2. Testing JPEG AI Super-Resolution (128x128 -> 256x256) ---")
    img_buf_jpeg = io.BytesIO()
    img_jpeg = Image.new("RGB", (128, 128), color="coral")
    img_jpeg.save(img_buf_jpeg, format="JPEG")
    img_buf_jpeg.seek(0)

    t0 = time.time()
    res_enh_jpeg = client.post(
        "/api/v1/image/enhance",
        files={"file": ("handicraft_pot.jpg", img_buf_jpeg, "image/jpeg")}
    )
    t1 = time.time()
    assert res_enh_jpeg.status_code == 200, f"Failed: {res_enh_jpeg.text}"
    data_jpeg = res_enh_jpeg.json()
    print(f"POST /api/v1/image/enhance (JPEG 128x128) -> {res_enh_jpeg.status_code} {data_jpeg}")
    print(f"  [Performance] 128x128 -> 256x256 CPU Inference Time: {t1 - t0:.3f}s")
    assert data_jpeg["original_filename"] == "handicraft_pot.jpg"
    assert data_jpeg["output_filename"] == "handicraft_pot_enhanced.png"
    assert data_jpeg["output_format"] == "PNG"
    assert data_jpeg["original_width"] == 128
    assert data_jpeg["original_height"] == 128
    assert data_jpeg["enhanced_width"] == 256
    assert data_jpeg["enhanced_height"] == 256
    assert data_jpeg["scale_factor"] == 2
    assert data_jpeg["status"] == "image enhanced successfully"

    print("\n--- 3. Testing 256x256 -> 512x512 AI Super-Resolution ---")
    img_buf_256 = io.BytesIO()
    img_256 = Image.new("RGB", (256, 256), color="goldenrod")
    img_256.save(img_buf_256, format="JPEG")
    img_buf_256.seek(0)

    t256_0 = time.time()
    res_256 = client.post(
        "/api/v1/image/enhance",
        files={"file": ("clay_vase_256.jpg", img_buf_256, "image/jpeg")}
    )
    t256_1 = time.time()
    assert res_256.status_code == 200, f"Failed: {res_256.text}"
    data_256 = res_256.json()
    print(f"POST /api/v1/image/enhance (JPEG 256x256) -> {res_256.status_code} {data_256}")
    print(f"  [Performance] 256x256 -> 512x512 CPU Inference Time: {t256_1 - t256_0:.3f}s")
    assert data_256["original_width"] == 256
    assert data_256["original_height"] == 256
    assert data_256["enhanced_width"] == 512
    assert data_256["enhanced_height"] == 512

    print("\n--- 4. Testing PNG AI Super-Resolution ---")
    img_buf_png = io.BytesIO()
    img_png = Image.new("RGB", (100, 150), color="teal")
    img_png.save(img_buf_png, format="PNG")
    img_buf_png.seek(0)

    res_enh_png = client.post(
        "/api/v1/image/enhance",
        files={"file": ("bamboo_vase.png", img_buf_png, "image/png")}
    )
    assert res_enh_png.status_code == 200
    data_png = res_enh_png.json()
    print(f"POST /api/v1/image/enhance (PNG) -> {res_enh_png.status_code} {data_png}")
    assert data_png["original_width"] == 100
    assert data_png["original_height"] == 150
    assert data_png["enhanced_width"] == 200
    assert data_png["enhanced_height"] == 300
    assert data_png["output_filename"] == "bamboo_vase_enhanced.png"

    print("\n--- 5. Testing WEBP AI Super-Resolution ---")
    img_buf_webp = io.BytesIO()
    img_webp = Image.new("RGB", (160, 120), color="indigo")
    img_webp.save(img_buf_webp, format="WEBP")
    img_buf_webp.seek(0)

    res_enh_webp = client.post(
        "/api/v1/image/enhance",
        files={"file": ("embroidered_shawl.webp", img_buf_webp, "image/webp")}
    )
    assert res_enh_webp.status_code == 200
    data_webp = res_enh_webp.json()
    print(f"POST /api/v1/image/enhance (WEBP) -> {res_enh_webp.status_code} {data_webp}")
    assert data_webp["enhanced_width"] == 320
    assert data_webp["enhanced_height"] == 240
    assert data_webp["output_filename"] == "embroidered_shawl_enhanced.png"

    print("\n--- 6. Testing Transparent PNG Enhancement (RGBA Preservation) ---")
    # Create an RGBA image with a solid square and transparent background
    img_rgba = Image.new("RGBA", (120, 120), (0, 0, 0, 0))
    for x in range(30, 90):
        for y in range(30, 90):
            img_rgba.putpixel((x, y), (255, 140, 0, 255))
    img_buf_rgba = io.BytesIO()
    img_rgba.save(img_buf_rgba, format="PNG")
    img_buf_rgba.seek(0)

    res_enh_rgba = client.post(
        "/api/v1/image/enhance",
        files={"file": ("clay_pot_no_bg.png", img_buf_rgba, "image/png")}
    )
    assert res_enh_rgba.status_code == 200, f"Failed: {res_enh_rgba.text}"
    data_rgba = res_enh_rgba.json()
    print(f"POST /api/v1/image/enhance (Transparent PNG) -> {res_enh_rgba.status_code} {data_rgba}")
    assert data_rgba["output_filename"] == "clay_pot_no_bg_enhanced.png"
    assert data_rgba["enhanced_width"] == 240
    assert data_rgba["enhanced_height"] == 240

    # Verify transparent output on disk
    saved_files = os.listdir(storage_dir)
    target_enhanced = [f for f in saved_files if "clay_pot_no_bg_enhanced.png" in f]
    assert len(target_enhanced) > 0, "Enhanced transparent PNG file missing on disk!"

    target_path = os.path.join(storage_dir, target_enhanced[0])
    opened_enhanced = Image.open(target_path)
    opened_enhanced.verify()
    opened_enhanced = Image.open(target_path)

    assert opened_enhanced.mode == "RGBA", f"Expected RGBA mode, got '{opened_enhanced.mode}'"
    alpha_ch = opened_enhanced.getchannel("A")
    min_a, max_a = alpha_ch.getextrema()
    assert min_a < 255, f"Transparent pixels lost! min_alpha = {min_a}"
    assert max_a > 0, f"Opaque foreground pixels lost! max_alpha = {max_a}"
    print(f"  [OK] RGBA Transparency Preserved: Mode={opened_enhanced.mode} | Alpha Range=[{min_a}, {max_a}]")

    print("\n--- 6b. Testing Odd-Dimension Input Handling (Odd W, Odd H, Odd W x Odd H) ---")
    # Test case 1: Odd width, Even height (125 x 128) -> Expected 250 x 256
    img_buf_odd_w = io.BytesIO()
    Image.new("RGB", (125, 128), color="red").save(img_buf_odd_w, format="JPEG")
    img_buf_odd_w.seek(0)
    res_odd_w = client.post("/api/v1/image/enhance", files={"file": ("odd_w.jpg", img_buf_odd_w, "image/jpeg")})
    assert res_odd_w.status_code == 200, f"Odd width test failed: {res_odd_w.text}"
    d_odd_w = res_odd_w.json()
    assert d_odd_w["original_width"] == 125 and d_odd_w["original_height"] == 128
    assert d_odd_w["enhanced_width"] == 250 and d_odd_w["enhanced_height"] == 256
    print(f"  [OK] Odd Width (125x128 -> 250x256) enhanced successfully")

    # Test case 2: Even width, Odd height (128 x 125) -> Expected 256 x 250
    img_buf_odd_h = io.BytesIO()
    Image.new("RGB", (128, 125), color="blue").save(img_buf_odd_h, format="JPEG")
    img_buf_odd_h.seek(0)
    res_odd_h = client.post("/api/v1/image/enhance", files={"file": ("odd_h.jpg", img_buf_odd_h, "image/jpeg")})
    assert res_odd_h.status_code == 200, f"Odd height test failed: {res_odd_h.text}"
    d_odd_h = res_odd_h.json()
    assert d_odd_h["original_width"] == 128 and d_odd_h["original_height"] == 125
    assert d_odd_h["enhanced_width"] == 256 and d_odd_h["enhanced_height"] == 250
    print(f"  [OK] Odd Height (128x125 -> 256x250) enhanced successfully")

    # Test case 3: Pottery1 dimensions (1000 x 625) -> Expected 2000 x 1250
    img_buf_pottery1 = io.BytesIO()
    Image.new("RGB", (1000, 625), color="saddlebrown").save(img_buf_pottery1, format="JPEG")
    img_buf_pottery1.seek(0)
    res_pottery1 = client.post("/api/v1/image/enhance", files={"file": ("pottery1.jpeg", img_buf_pottery1, "image/jpeg")})
    assert res_pottery1.status_code == 200, f"pottery1.jpeg test failed: {res_pottery1.text}"
    d_pottery1 = res_pottery1.json()
    assert d_pottery1["original_width"] == 1000 and d_pottery1["original_height"] == 625
    assert d_pottery1["enhanced_width"] == 2000 and d_pottery1["enhanced_height"] == 1250
    assert d_pottery1["status"] == "image enhanced successfully"
    print(f"  [OK] Pottery1 Odd Height (1000x625 -> 2000x1250) enhanced successfully: {d_pottery1['enhanced_width']}x{d_pottery1['enhanced_height']}")

    print("\n--- 7. Testing Invalid File Type (.txt) ---")
    res_txt = client.post(
        "/api/v1/image/enhance",
        files={"file": ("notes.txt", b"Invalid text data", "text/plain")}
    )
    assert res_txt.status_code == 400
    print(f"POST /api/v1/image/enhance (TXT) -> {res_txt.status_code} {res_txt.json()}")

    print("\n--- 8. Testing Corrupted Image Data ---")
    res_corrupt = client.post(
        "/api/v1/image/enhance",
        files={"file": ("corrupt.jpg", b"NOT AN IMAGE", "image/jpeg")}
    )
    assert res_corrupt.status_code == 400
    print(f"POST /api/v1/image/enhance (Corrupt) -> {res_corrupt.status_code} {res_corrupt.json()}")

    print("\n--- 9. Testing Automatic Resizing of Large Mobile Photos (1200x1600) ---")
    img_buf_large = io.BytesIO()
    img_large = Image.new("RGB", (1200, 1600), color="pink")
    img_large.save(img_buf_large, format="JPEG")
    img_buf_large.seek(0)
    res_large = client.post(
        "/api/v1/image/enhance",
        files={"file": ("mobile_photo_1200x1600.jpg", img_buf_large, "image/jpeg")}
    )
    assert res_large.status_code == 200, f"Large mobile photo failed: {res_large.text}"
    d_large = res_large.json()
    assert d_large["original_width"] == 1200 and d_large["original_height"] == 1600
    # Working size = 768x1024, 2x enhanced = 1536x2048
    assert d_large["enhanced_width"] == 1536 and d_large["enhanced_height"] == 2048
    print(f"  [OK] Large Mobile Photo (1200x1600 -> 1536x2048) enhanced successfully!")

    print("\n--- 10. Verifying Model Session Cache Reuse ---")
    t_start = time.time()
    res_fast = client.post(
        "/api/v1/image/enhance",
        files={"file": ("reuse_test.jpg", img_buf_jpeg, "image/jpeg")}
    )
    t_end = time.time()
    assert res_fast.status_code == 200
    print(f"Cached Model Inference Execution: {t_end - t_start:.3f}s")

    print("\n[SUCCESS] ALL PHASE 4 SUPER-RESOLUTION TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    run_tests()
