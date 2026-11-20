#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""把 2K 地面纹理处理成 2440×888 的大世界地面（2px 像素块）。"""
import sys
import os

sys.path.insert(0, r"D:\ClaudeWork\tools\pydeps")

from PIL import Image, ImageEnhance

W, H = 2440, 888
HALF = (1220, 444)
PALETTE = 48

RAW_DIR = r"D:\ClaudeWork\HotBreakthrough\assets\game\_raw\2026-11-20"
OUT_DIR = r"D:\ClaudeWork\HotBreakthrough\assets\game\grounds"

ITEMS = [
    ("sand", "seedream_1795138102_1.png", "sand_world.png", {}),
    ("purple", "seedream_1795139412_1.png", "purple_world.png", {"color": 0.55, "brightness": 0.82}),
    ("mint", "seedream_1795139443_1.png", "mint_world.png", {"color": 0.65, "brightness": 0.96}),
]


def process(src_path, dest_path, adjust):
    im = Image.open(src_path).convert("RGB")
    w, h = im.size
    ratio = W / H
    ch = int(w / ratio)
    top = (h - ch) // 2
    crop = im.crop((0, top, w, top + ch))

    if "color" in adjust:
        crop = ImageEnhance.Color(crop).enhance(adjust["color"])
    if "brightness" in adjust:
        crop = ImageEnhance.Brightness(crop).enhance(adjust["brightness"])

    small = crop.resize(HALF, Image.LANCZOS)
    small = small.quantize(colors=PALETTE, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB")
    out = small.resize((W, H), Image.NEAREST)
    out.save(dest_path, "PNG")
    print("OK %s -> %s %dx%d" % (os.path.basename(src_path), dest_path, out.width, out.height))


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for theme, raw_name, out_name, adjust in ITEMS:
        src = os.path.join(RAW_DIR, raw_name)
        dest = os.path.join(OUT_DIR, out_name)
        if not os.path.exists(src):
            print("MISS %s" % src)
            continue
        process(src, dest, adjust)


if __name__ == "__main__":
    main()
