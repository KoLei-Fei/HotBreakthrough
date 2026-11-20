#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""把 Seedream 生成的 1K 地面纹理处理成 1220×444、2px 像素块的游戏地面。

用法：
  python -I tools/ProcessGround.py
"""
import sys
import os

sys.path.insert(0, r"D:\ClaudeWork\tools\pydeps")

from PIL import Image, ImageEnhance

W, H = 1220, 444
HALF = (W // 2, H // 2)
PALETTE = 40

RAW_DIR = r"D:\ClaudeWork\HotBreakthrough\assets\game\_raw\2026-11-19"
OUT_DIR = r"D:\ClaudeWork\HotBreakthrough\assets\game\grounds"

ITEMS = [
    ("sand", "seedream_1795070041_1.png", "sand_ground.png", {}),
    # 细碎石板版本，降低饱和度与亮度，避免地面压过角色
    ("purple", "seedream_1795070340_1.png", "purple_ground.png", {"color": 0.55, "brightness": 0.82}),
    ("mint", "seedream_1795070127_1.png", "mint_ground.png", {"color": 0.65, "brightness": 0.96}),
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

    # 先降到一半尺寸并限色，再最近邻放大，形成和角色一致的 2px 像素块
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
