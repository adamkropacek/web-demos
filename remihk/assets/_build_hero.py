"""Rebuild REMI HK hero from the ORIGINAL 1000px source (not the already-upscaled 1800px).
Single clean upscale + edge-aware sharpen + local contrast + fine grain + vignette.
Cost-zero, OpenCV only. Output: hero.jpg (replaces the soft 1.8x-interpolated one).
"""
import cv2, numpy as np, os

SRC = r"c:/Users/adamk/Desktop/newvs/clients/remihk/assets/renata_realizace/08_05-Pavillon-wellness_hp-01_velka.jpg"
OUT = r"c:/Users/adamk/Desktop/newvs/.work/web-demos/remihk/assets/hero.jpg"
TARGET_W = 1920

img = cv2.imread(SRC, cv2.IMREAD_COLOR)
h0, w0 = img.shape[:2]
print(f"source: {w0}x{h0}")

# 1) single high-quality upscale (Lanczos) to target width
scale = TARGET_W / w0
tw, th = TARGET_W, round(h0 * scale)
up = cv2.resize(img, (tw, th), interpolation=cv2.INTER_LANCZOS4)

# 2) edge-aware denoise first (kills JPEG mush before we sharpen it)
den = cv2.bilateralFilter(up, d=7, sigmaColor=28, sigmaSpace=7)

# 3) unsharp mask (radius scaled to size) - genuine perceived detail
blur = cv2.GaussianBlur(den, (0, 0), sigmaX=2.2)
sharp = cv2.addWeighted(den, 1.45, blur, -0.45, 0)

# 4) gentle local contrast via CLAHE on L channel (makes stone/mosaic pop)
lab = cv2.cvtColor(sharp, cv2.COLOR_BGR2LAB)
l, a, b = cv2.split(lab)
clahe = cv2.createCLAHE(clipLimit=1.6, tileGridSize=(8, 8))
l = clahe.apply(l)
out = cv2.cvtColor(cv2.merge((l, a, b)), cv2.COLOR_LAB2BGR)

# 5) subtle vignette (focuses eye, hides edge softness)
yy, xx = np.mgrid[0:th, 0:tw]
cx, cy = tw / 2, th / 2
r = np.sqrt(((xx - cx) / (tw * 0.62)) ** 2 + ((yy - cy) / (th * 0.62)) ** 2)
vig = np.clip(1.0 - (r ** 2) * 0.28, 0.72, 1.0).astype(np.float32)
out = (out.astype(np.float32) * vig[..., None]).clip(0, 255).astype(np.uint8)

# 6) fine film grain (reads as editorial, masks residual softness)
rng = np.random.default_rng(7)
grain = rng.normal(0, 2.2, (th, tw, 1)).astype(np.float32)
out = (out.astype(np.float32) + grain).clip(0, 255).astype(np.uint8)

# 7) encode, target < ~460KB
for q in (88, 86, 84, 82, 80, 78):
    ok, buf = cv2.imencode(".jpg", out, [cv2.IMWRITE_JPEG_QUALITY, q, cv2.IMWRITE_JPEG_OPTIMIZE, 1])
    if ok and len(buf) <= 400_000:
        break
with open(OUT, "wb") as f:
    f.write(buf.tobytes())
print(f"out: {tw}x{th}  q={q}  {len(buf)//1024}KB  -> {OUT}")
