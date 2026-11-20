#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""把品红底 AI 精灵处理成透明 PNG，并缩放到目标尺寸。

用法：
  python -I tools/ProcessSprite.py --input raw.png --output out.png --size 48
"""
import sys
import argparse
import collections

sys.path.insert(0, r"D:\ClaudeWork\tools\pydeps")

from PIL import Image


def bg_color(im):
    """取四角 8×8 区域的中位色作为背景色。"""
    w, h = im.size
    patch = 8
    samples = []
    for (x, y) in [(0, 0), (w - patch, 0), (0, h - patch), (w - patch, h - patch)]:
        crop = im.crop((x, y, x + patch, y + patch))
        samples.extend(crop.getdata())
    r = sorted(p[0] for p in samples)[len(samples) // 2]
    g = sorted(p[1] for p in samples)[len(samples) // 2]
    b = sorted(p[2] for p in samples)[len(samples) // 2]
    return (r, g, b)


def remove_bg(im, bg, tol):
    """把与外界连通的背景色像素置为透明，保留角色内部的深色像素。"""
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)
    q = collections.deque()

    def is_bg(x, y):
        r, g, b, _ = px[x, y]
        return (r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2 <= tol * tol

    # 从四条边出发
    for x in range(w):
        for y in (0, h - 1):
            if not seen[y * w + x] and is_bg(x, y):
                seen[y * w + x] = 1
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if not seen[y * w + x] and is_bg(x, y):
                seen[y * w + x] = 1
                q.append((x, y))

    while q:
        x, y = q.popleft()
        r, g, b, _ = px[x, y]
        px[x, y] = (r, g, b, 0)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and is_bg(nx, ny):
                seen[ny * w + nx] = 1
                q.append((nx, ny))
    return im


def despill(im, bg):
    """按到背景色的距离生成半透明边缘，并对边缘做去背景色溢色。"""
    w, h = im.size
    px = im.load()
    lo, hi = 18, 110
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            d = ((r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2) ** 0.5
            if d <= lo:
                px[x, y] = (r, g, b, 0)
                continue
            alpha = 1.0 if d >= hi else (d - lo) / float(hi - lo)
            if alpha < 1.0:
                # C_fg = (C - (1 - alpha) * bg) / alpha
                r = int(max(0, min(255, (r - (1 - alpha) * bg[0]) / alpha)))
                g = int(max(0, min(255, (g - (1 - alpha) * bg[1]) / alpha)))
                b = int(max(0, min(255, (b - (1 - alpha) * bg[2]) / alpha)))
            px[x, y] = (r, g, b, int(255 * alpha))
    return im


def process(input_path, output_path, size, tol, margin, colors):
    im = Image.open(input_path).convert("RGBA")
    bg = bg_color(im.convert("RGB"))
    im = remove_bg(im, bg, tol)

    # 顺便清除与边缘不相连但明显是品红的像素（例如两腿之间的小块）
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a > 0 and (r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2 <= (tol * 0.75) ** 2:
                px[x, y] = (r, g, b, 0)
    im = despill(im, bg)

    bbox = im.getbbox()
    if not bbox:
        raise ValueError("没有识别到角色内容")

    content = im.crop(bbox)
    cw, ch = content.size
    target = size - margin * 2
    scale = min(target / cw, target / ch)
    nw, nh = max(1, int(round(cw * scale))), max(1, int(round(ch * scale)))
    content = content.resize((nw, nh), Image.LANCZOS)

    if colors > 0:
        rgb = content.convert("RGB").quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB")
        content = rgb.convert("RGBA")
        content.putalpha(content.getchannel("A"))

    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(content, ((size - nw) // 2, (size - nh) // 2), content)
    canvas.save(output_path, "PNG")

    coverage = sum(1 for p in canvas.getdata() if p[3] > 0) / float(size * size)
    print("OK %s bg=%s size=%d content=%dx%d coverage=%.1f%%" % (output_path, bg, size, nw, nh, coverage * 100))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--output", required=True)
    ap.add_argument("--size", type=int, default=48)
    ap.add_argument("--tol", type=int, default=80)
    ap.add_argument("--margin", type=int, default=2)
    ap.add_argument("--colors", type=int, default=0)
    args = ap.parse_args()
    process(args.input, args.output, args.size, args.tol, args.margin, args.colors)


if __name__ == "__main__":
    main()
