import io
import time
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_enhance_image_binary_endpoint():
    print("--- 1. Testing Health Endpoint ---")
    res_health = client.get("/health")
    assert res_health.status_code == 200
    print(f"GET /health -> {res_health.status_code} {res_health.json()}")

    print("\n--- 2. Testing JPEG Binary Enhancement (POST /api/v1/image/enhance-image) ---")
    img_buf_jpeg = io.BytesIO()
    img_jpeg = Image.new("RGB", (100, 80), color=(204, 78, 48))
    img_jpeg.save(img_buf_jpeg, format="JPEG")
    img_buf_jpeg.seek(0)

    t0 = time.time()
    res_jpeg = client.post(
        "/api/v1/image/enhance-image",
        files={"file": ("clay_pot.jpg", img_buf_jpeg, "image/jpeg")}
    )
    t1 = time.time()

    assert res_jpeg.status_code == 200, f"Failed: {res_jpeg.text}"
    assert res_jpeg.headers["content-type"] == "image/png"
    print(f"POST /api/v1/image/enhance-image (JPEG 100x80) -> {res_jpeg.status_code}")
    print(f"  Header Content-Type: {res_jpeg.headers['content-type']}")
    print(f"  Binary Response Size: {len(res_jpeg.content)} bytes | Time: {t1 - t0:.3f}s")

    # Verify PNG image parsing & 2x dimensions with Pillow
    out_jpeg_pil = Image.open(io.BytesIO(res_jpeg.content))
    assert out_jpeg_pil.format == "PNG"
    assert out_jpeg_pil.size == (200, 160)
    print(f"  [OK] Parsed enhanced PNG: Format={out_jpeg_pil.format}, Size={out_jpeg_pil.size} (Expected 200x160)")

    print("\n--- 3. Testing PNG Binary Enhancement (POST /api/v1/image/enhance-image) ---")
    img_buf_png = io.BytesIO()
    img_png = Image.new("RGB", (120, 120), color="darkgreen")
    img_png.save(img_buf_png, format="PNG")
    img_buf_png.seek(0)

    res_png = client.post(
        "/api/v1/image/enhance-image",
        files={"file": ("bamboo_box.png", img_buf_png, "image/png")}
    )
    assert res_png.status_code == 200
    assert res_png.headers["content-type"] == "image/png"
    out_png_pil = Image.open(io.BytesIO(res_png.content))
    assert out_png_pil.format == "PNG"
    assert out_png_pil.size == (240, 240)
    print(f"POST /api/v1/image/enhance-image (PNG 120x120) -> {res_png.status_code} | Size={out_png_pil.size}")

    print("\n--- 3b. Testing WEBP Binary Enhancement ---")
    img_buf_webp = io.BytesIO()
    Image.new("RGB", (110, 90), color="indigo").save(img_buf_webp, format="WEBP")
    img_buf_webp.seek(0)
    res_webp = client.post("/api/v1/image/enhance-image", files={"file": ("shawl.webp", img_buf_webp, "image/webp")})
    assert res_webp.status_code == 200
    out_webp_pil = Image.open(io.BytesIO(res_webp.content))
    assert out_webp_pil.format == "PNG"
    assert out_webp_pil.size == (220, 180)
    print(f"  [OK] WEBP enhanced successfully: Size={out_webp_pil.size}")

    print("\n--- 3c. Testing Transparent RGBA PNG Input ---")
    img_buf_rgba = io.BytesIO()
    img_rgba = Image.new("RGBA", (100, 100), (0, 0, 0, 0))
    for x in range(25, 75):
        for y in range(25, 75):
            img_rgba.putpixel((x, y), (255, 140, 0, 255))
    img_rgba.save(img_buf_rgba, format="PNG")
    img_buf_rgba.seek(0)
    res_rgba = client.post("/api/v1/image/enhance-image", files={"file": ("clay_pot_no_bg.png", img_buf_rgba, "image/png")})
    assert res_rgba.status_code == 200
    out_rgba_pil = Image.open(io.BytesIO(res_rgba.content))
    assert out_rgba_pil.format == "PNG"
    assert out_rgba_pil.size == (200, 200)
    print(f"  [OK] Transparent RGBA PNG enhanced successfully: Size={out_rgba_pil.size}")

    print("\n--- 3d. Testing Odd Image Dimensions & Neutral Background Verification ---")
    img_buf_odd = io.BytesIO()
    # 1000x625 image (Height 625 is odd) with a red square product centered
    img_odd = Image.new("RGB", (1000, 625), color="white")
    for x in range(400, 600):
        for y in range(200, 400):
            img_odd.putpixel((x, y), (200, 40, 40))
    img_odd.save(img_buf_odd, format="JPEG")
    img_buf_odd.seek(0)
    res_odd = client.post("/api/v1/image/enhance-image", files={"file": ("pottery_odd.jpeg", img_buf_odd, "image/jpeg")})
    assert res_odd.status_code == 200
    out_odd_pil = Image.open(io.BytesIO(res_odd.content))
    assert out_odd_pil.format == "PNG"
    assert out_odd_pil.size == (2000, 1250)
    
    # Verify top-left background pixel matches clean studio neutral color (approx 248, 248, 248)
    bg_pixel = out_odd_pil.getpixel((10, 10))
    # Check R, G, B channels are close to 248 (off-white studio neutral)
    assert abs(bg_pixel[0] - 248) <= 15 and abs(bg_pixel[1] - 248) <= 15 and abs(bg_pixel[2] - 248) <= 15, f"Expected neutral background, got {bg_pixel}"
    
    # Verify product foreground is preserved in center
    center_pixel = out_odd_pil.getpixel((1000, 600))
    assert center_pixel[0] > 100, f"Product color missing in center! Pixel={center_pixel}"
    print(f"  [OK] Odd Dimensions (1000x625 -> 2000x1250) & Studio Neutral Background RGB(248,248,248) verified!")

    print("\n--- 3e. Testing Small Input Photo (300x400) ---")
    img_buf_small = io.BytesIO()
    Image.new("RGB", (300, 400), color=(180, 100, 50)).save(img_buf_small, format="JPEG")
    img_buf_small.seek(0)
    res_small = client.post("/api/v1/image/enhance-image", files={"file": ("small_craft.jpg", img_buf_small, "image/jpeg")})
    assert res_small.status_code == 200
    out_small_pil = Image.open(io.BytesIO(res_small.content))
    assert out_small_pil.format == "PNG"
    assert out_small_pil.size == (600, 800)
    print(f"  [OK] Small Photo (300x400 -> 600x800) enhanced successfully!")

    print("\n--- 3f. Testing Large Mobile/Camera Photos (2000x3000, 3000x2000, 4032x3024) ---")
    # 2000x3000 Portrait Phone Upload
    img_buf_p2k = io.BytesIO()
    Image.new("RGB", (2000, 3000), color=(100, 150, 200)).save(img_buf_p2k, format="JPEG")
    img_buf_p2k.seek(0)
    res_p2k = client.post("/api/v1/image/enhance-image", files={"file": ("portrait_2000x3000.jpg", img_buf_p2k, "image/jpeg")})
    assert res_p2k.status_code == 200
    out_p2k_pil = Image.open(io.BytesIO(res_p2k.content))
    assert out_p2k_pil.format == "PNG"
    # Working size: 683x1024, 2x enhanced: 1366x2048
    assert out_p2k_pil.size == (1366, 2048)
    print(f"  [OK] 2000x3000 Portrait Phone Photo -> {out_p2k_pil.size} enhanced successfully!")

    # 3000x2000 Landscape Phone Upload
    img_buf_l3k = io.BytesIO()
    Image.new("RGB", (3000, 2000), color=(150, 200, 100)).save(img_buf_l3k, format="JPEG")
    img_buf_l3k.seek(0)
    res_l3k = client.post("/api/v1/image/enhance-image", files={"file": ("landscape_3000x2000.jpg", img_buf_l3k, "image/jpeg")})
    assert res_l3k.status_code == 200
    out_l3k_pil = Image.open(io.BytesIO(res_l3k.content))
    assert out_l3k_pil.format == "PNG"
    # Working size: 1024x683, 2x enhanced: 2048x1366
    assert out_l3k_pil.size == (2048, 1366)
    print(f"  [OK] 3000x2000 Landscape Phone Photo -> {out_l3k_pil.size} enhanced successfully!")

    # 4032x3024 4K Camera Upload
    img_buf_4k = io.BytesIO()
    Image.new("RGB", (4032, 3024), color=(220, 180, 120)).save(img_buf_4k, format="JPEG")
    img_buf_4k.seek(0)
    res_4k = client.post("/api/v1/image/enhance-image", files={"file": ("camera_4032x3024.jpg", img_buf_4k, "image/jpeg")})
    assert res_4k.status_code == 200
    out_4k_pil = Image.open(io.BytesIO(res_4k.content))
    assert out_4k_pil.format == "PNG"
    # Working size: 1024x768, 2x enhanced: 2048x1536
    assert out_4k_pil.size == (2048, 1536)
    print(f"  [OK] 4032x3024 4K Camera Upload -> {out_4k_pil.size} enhanced successfully!")

    print("\n--- 4. Testing Invalid File Type (.txt) ---")
    res_txt = client.post(
        "/api/v1/image/enhance-image",
        files={"file": ("document.txt", b"Plain text content", "text/plain")}
    )
    assert res_txt.status_code == 400
    print(f"POST /api/v1/image/enhance-image (TXT) -> {res_txt.status_code} {res_txt.json()}")

    print("\n--- 5. Testing Corrupted Image File ---")
    res_corrupt = client.post(
        "/api/v1/image/enhance-image",
        files={"file": ("bad_image.jpg", b"INVALID CORRUPT BYTES", "image/jpeg")}
    )
    assert res_corrupt.status_code == 400
    print(f"POST /api/v1/image/enhance-image (Corrupt) -> {res_corrupt.status_code} {res_corrupt.json()}")

    print("\n[SUCCESS] ALL POST /api/v1/image/enhance-image ENDPOINT TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    test_enhance_image_binary_endpoint()
