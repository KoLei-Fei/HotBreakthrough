#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""把素材目录拼成带编号的放大总览图。"""
import sys, os
sys.path.insert(0, r"D:\ClaudeWork\tools\pydeps")
from PIL import Image, ImageDraw

BASE = r"D:\ClaudeWork\HotBreakthrough\assets\kenney_desert-shooter-pack_1.0\PNG"
OUT = r"D:\ClaudeWork\temp"

def overview(cat, cols, scale, max_items=None):
    d = os.path.join(BASE, cat, "Tiles")
    files = sorted(f for f in os.listdir(d) if f.endswith(".png"))
    if max_items:
        files = files[:max_items]
    if not files:
        return
    sample = Image.open(os.path.join(d, files[0]))
    tw, th = sample.size
    cell_w, cell_h = tw * scale + 12, th * scale + 30
    rows = (len(files) + cols - 1) // cols
    canvas = Image.new("RGBA", (cols * cell_w + 12, rows * cell_h + 12), (40, 40, 48, 255))
    draw = ImageDraw.Draw(canvas)
    for i, f in enumerate(files):
        img = Image.open(os.path.join(d, f)).convert("RGBA")
        img = img.resize((tw * scale, th * scale), Image.NEAREST)
        x = 12 + (i % cols) * cell_w
        y = 12 + (i // cols) * cell_h
        canvas.alpha_composite(img, (x, y + 18))
        draw.text((x, y + 2), f.replace("tile_", "").replace(".png", ""), fill=(255, 255, 255, 255))
    path = os.path.join(OUT, "overview_%s.png" % cat)
    canvas.save(path)
    print("OK %s %dx%d tiles=%d cell=%dx%d" % (path, canvas.size[0], canvas.size[1], len(files), tw, th))

overview("Players", 4, 3)
overview("Enemies", 4, 3)
overview("Weapons", 8, 2)
overview("Interface", 10, 2, 60)
overview("Tiles", 12, 1, 96)
