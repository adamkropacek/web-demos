"""Render hero variants 1/2/3 (+ current) AS THEY APPEAR ON SITE (gradient + text).
Output: _hero_compare.png  and  _hero_compare.pdf  for easy side-by-side review.
"""
import cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont

REAL = r"c:/Users/adamk/Desktop/newvs/clients/remihk/assets/renata_realizace/"
SRC08 = REAL + "08_05-Pavillon-wellness_hp-01_velka.jpg"   # 1000x659 (current hero source)
SRC12 = REAL + "12_Pavillon-Spa-koupelna-02.jpg"            # 1600x1067 (highest-res landscape)
PANEL_W, PANEL_H = 1280, 720

def center_crop_169(img):
    h, w = img.shape[:2]
    tw, th = w, round(w * 9 / 16)
    if th > h:
        th = h; tw = round(h * 16 / 9)
    x = (w - tw) // 2; y = int((h - th) * 0.42)  # slight upper bias
    return img[y:y+th, x:x+tw]

def finish(img, sharp_amt=0.45, clahe=1.6, vig=0.28, grain=2.2, dark=1.0):
    up = cv2.resize(img, (PANEL_W*2, PANEL_H*2), interpolation=cv2.INTER_LANCZOS4)
    den = cv2.bilateralFilter(up, 7, 28, 7)
    blur = cv2.GaussianBlur(den, (0,0), 2.2)
    s = cv2.addWeighted(den, 1+sharp_amt, blur, -sharp_amt, 0)
    lab = cv2.cvtColor(s, cv2.COLOR_BGR2LAB); l,a,b = cv2.split(lab)
    l = cv2.createCLAHE(clipLimit=clahe, tileGridSize=(8,8)).apply(l)
    out = cv2.cvtColor(cv2.merge((l,a,b)), cv2.COLOR_LAB2BGR).astype(np.float32)
    th2, tw2 = out.shape[:2]
    yy,xx = np.mgrid[0:th2,0:tw2]; cx,cy=tw2/2,th2/2
    r = np.sqrt(((xx-cx)/(tw2*0.62))**2 + ((yy-cy)/(th2*0.62))**2)
    v = np.clip(1.0 - (r**2)*vig, 1-vig-0.05, 1.0).astype(np.float32)
    out *= v[...,None]
    out *= dark
    g = np.random.default_rng(7).normal(0, grain, (th2,tw2,1)).astype(np.float32)
    out = (out+g).clip(0,255).astype(np.uint8)
    return cv2.resize(out, (PANEL_W, PANEL_H), interpolation=cv2.INTER_AREA)

def naive_current(img):
    # mimic current deploy: 1000 -> 1800 upscale (cubic), then shown bigger -> soft
    up = cv2.resize(img, (1800, round(img.shape[0]*1800/img.shape[1])), interpolation=cv2.INTER_CUBIC)
    return cv2.resize(center_crop_169(up), (PANEL_W, PANEL_H), interpolation=cv2.INTER_CUBIC)

i08 = cv2.imread(SRC08); i12 = cv2.imread(SRC12)
panels = {
 "0 - SOUCASNY (pred)":              naive_current(i08),
 "1 - DOOSTRENI + grain/vignette":   finish(center_crop_169(i08), 0.55, 1.8, 0.26, 2.0, 1.0),
 "2 - JINA FOTKA (nativni 1600px)":  finish(center_crop_169(i12), 0.45, 1.6, 0.24, 1.8, 1.0),
 "3 - EDITORIAL (tmavsi, vic nalady)":finish(center_crop_169(i08), 0.30, 1.3, 0.40, 4.0, 0.86),
}

# fonts
def font(path, size):
    try: return ImageFont.truetype(path, size)
    except: return ImageFont.load_default()
SERIF = "C:/Windows/Fonts/georgia.ttf"; SERIF_I = "C:/Windows/Fonts/georgiai.ttf"
SANS  = "C:/Windows/Fonts/arial.ttf"
f_eye = font(SANS, 15); f_h1 = font(SERIF, 64); f_h1i = font(SERIF_I, 64); f_lead = font(SANS, 19)

def to_pil_with_overlay(bgr):
    pil = Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)).convert("RGB")
    grad = Image.new("L", (PANEL_W,1))
    for x in range(PANEL_W):
        t = x/PANEL_W
        # 0.88 -> 0.02 like site
        aL = 0.88*(1-min(t/0.78,1))**1.1 + 0.02
        grad.putpixel((x,0), int(aL*255))
    grad = grad.resize((PANEL_W,PANEL_H))
    dark = Image.new("RGB",(PANEL_W,PANEL_H),(15,17,22))
    pil = Image.composite(dark, pil, grad)
    # bottom fade
    bf = Image.new("L",(1,PANEL_H))
    for y in range(PANEL_H):
        bf.putpixel((0,y), int(150*max(0,(y/PANEL_H-0.45)/0.55)))
    bf = bf.resize((PANEL_W,PANEL_H))
    pil = Image.composite(dark, pil, bf)
    d = ImageDraw.Draw(pil)
    X=70; cream=(250,247,241); brass=(184,153,104)
    d.text((X,210), "KOUPELNOVE STUDIO  ·  HRADEC KRALOVE", font=f_eye, fill=brass)
    d.text((X,250), "Koupelna jako prostor,", font=f_h1, fill=cream)
    d.text((X,322), "ne jen mistnost.", font=f_h1i, fill=brass)
    lead=["V netradicni vzorkovne v Gayerovych kasarnach si vyberete","obklady, dlazby, sanitu, baterie i doplnky od evropskych vyrobcu."]
    for k,ln in enumerate(lead):
        d.text((X,420+k*28), ln, font=f_lead, fill=(255,255,255))
    return pil

# compose vertical sheet
CAP=46; GAP=22; MARGIN=40
W = PANEL_W + MARGIN*2
H = MARGIN*2 + len(panels)*(PANEL_H+CAP+GAP)
sheet = Image.new("RGB",(W,H),(28,29,33))
d = ImageDraw.Draw(sheet)
f_cap = font(SANS, 24); y = MARGIN
pages=[]
for name,bgr in panels.items():
    d.rectangle([MARGIN,y,MARGIN+PANEL_W,y+CAP],fill=(15,17,22))
    d.text((MARGIN+16,y+11), name, font=f_cap, fill=(184,153,104))
    p = to_pil_with_overlay(bgr); pages.append(p.copy())
    sheet.paste(p,(MARGIN,y+CAP)); y += PANEL_H+CAP+GAP

sheet.save("_hero_compare.png")
# pdf: one variant per page, full-bleed
pdf_pages=[]
for name,p in zip(panels.keys(),pages):
    pg = Image.new("RGB",(PANEL_W,PANEL_H+CAP),(15,17,22))
    dd=ImageDraw.Draw(pg); dd.text((16,11),name,font=f_cap,fill=(184,153,104))
    pg.paste(p,(0,CAP)); pdf_pages.append(pg)
pdf_pages[0].save("_hero_compare.pdf", save_all=True, append_images=pdf_pages[1:])
print("OK  ->  _hero_compare.png  +  _hero_compare.pdf")
