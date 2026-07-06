"""Real neural super-resolution of the hero via Swin2SR (transformers, CPU).
Source is WhatsApp-grade JPEG -> use the compressed-image SR model.
x4 -> downscale to 2400w + light finishing. Cost-zero, local weights download from HF.
"""
import sys, time, numpy as np, cv2, torch
from PIL import Image
from transformers import Swin2SRForImageSuperResolution, AutoImageProcessor

SRC = r"c:/Users/adamk/Desktop/newvs/clients/remihk/assets/renata_realizace/08_05-Pavillon-wellness_hp-01_velka.jpg"
OUT = r"c:/Users/adamk/Desktop/newvs/.work/web-demos/remihk/assets/hero.jpg"
FINAL_W = 2400

torch.set_num_threads(max(1, (torch.get_num_threads() or 4)))
t0 = time.time()

candidates = [
    "caidas/swin2SR-compressed-sr-x4-48",
    "caidas/swin2SR-classical-sr-x4-64",
]
model = proc = None
for m in candidates:
    try:
        print("loading", m, flush=True)
        model = Swin2SRForImageSuperResolution.from_pretrained(m)
        proc = AutoImageProcessor.from_pretrained(m)
        print("loaded", m, flush=True)
        break
    except Exception as e:
        print("fail", m, repr(e)[:160], flush=True)
if model is None:
    print("NO_MODEL"); sys.exit(1)
model.eval()

SCALE = 4
img = Image.open(SRC).convert("RGB")
W0, H0 = img.size
arr = np.asarray(img)                      # (H,W,3) RGB uint8
print("source", img.size, "tiled infer...", flush=True)

TILE = 224          # input tile px
OVL = 24            # overlap px
acc = np.zeros((H0*SCALE, W0*SCALE, 3), np.float32)
wsum = np.zeros((H0*SCALE, W0*SCALE, 1), np.float32)

def run_tile(t):
    inp = proc(Image.fromarray(t), return_tensors="pt")
    with torch.no_grad():
        o = model(**inp)
    r = o.reconstruction.data.squeeze().float().clamp(0, 1).cpu().numpy()
    return np.transpose(r, (1, 2, 0))      # (h*4,w*4,3)

ys = list(range(0, H0, TILE - OVL))
xs = list(range(0, W0, TILE - OVL))
n = len(ys) * len(xs); k = 0
for y in ys:
    for x in xs:
        y2, x2 = min(y + TILE, H0), min(x + TILE, W0)
        y1, x1 = max(0, y2 - TILE), max(0, x2 - TILE)
        tile = arr[y1:y2, x1:x2]
        sr = run_tile(tile)
        th, tw = sr.shape[:2]
        # feather mask (cosine edges) to blend overlaps seamlessly
        fy = np.ones(th, np.float32); fx = np.ones(tw, np.float32)
        f = OVL * SCALE
        ramp = (1 - np.cos(np.linspace(0, np.pi, f))) / 2
        fy[:f] = ramp; fy[-f:] = ramp[::-1]; fx[:f] = ramp; fx[-f:] = ramp[::-1]
        m = (fy[:, None] * fx[None, :])[..., None]
        Y, X = y1 * SCALE, x1 * SCALE
        acc[Y:Y+th, X:X+tw] += sr * m
        wsum[Y:Y+th, X:X+tw] += m
        k += 1
        print(f"tile {k}/{n}  {time.time()-t0:.0f}s", flush=True)

sr = (np.clip(acc / np.maximum(wsum, 1e-6), 0, 1) * 255).round().astype(np.uint8)
print("SR size", sr.shape[1], "x", sr.shape[0], f"  {time.time()-t0:.0f}s", flush=True)

bgr = cv2.cvtColor(sr, cv2.COLOR_RGB2BGR)
cv2.imwrite(r"c:/Users/adamk/Desktop/newvs/.work/web-demos/remihk/assets/hero_raw.png", bgr)  # raw SR for future tuning
# downscale to final width (downscaling neural-SR = crisp, clean)
h, w = bgr.shape[:2]
fw = FINAL_W if w >= FINAL_W else w
fh = round(h * fw / w)
bgr = cv2.resize(bgr, (fw, fh), interpolation=cv2.INTER_AREA)

# NO CLAHE / NO vignette - oboji delalo tmavy "AI" halo kolem bilych van.
# Jen velmi jemne filmove zrno, jinak ciste neural.
bgr = (bgr.astype(np.float32) + np.random.default_rng(7).normal(0, 1.3, (fh, fw, 1)).astype(np.float32)).clip(0, 255).astype(np.uint8)

for q in (90, 88, 86, 84, 82, 80):
    ok, buf = cv2.imencode(".jpg", bgr, [cv2.IMWRITE_JPEG_QUALITY, q, cv2.IMWRITE_JPEG_OPTIMIZE, 1])
    if ok and len(buf) <= 480_000:
        break
open(OUT, "wb").write(buf.tobytes())
print(f"DONE {fw}x{fh} q={q} {len(buf)//1024}KB {time.time()-t0:.0f}s -> {OUT}", flush=True)
