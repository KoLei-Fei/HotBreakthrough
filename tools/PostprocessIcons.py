#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""将纯黑底 AI 图标转为透明 PNG，裁切、居中并缩放到目标尺寸。

用法：
  python -I tools/PostprocessIcons.py --input raw.png --output out.png --size 256
"""
import sys
import argparse

sys.path.insert(0, r"D:\ClaudeWork\tools\pydeps")

from PIL import Image, ImageChops


def background_color(src):
    """取四角 12x12 区域的中位色作为背景色。"""
    w, h = src.size
    patch = 12
    probe = Image.new("RGB", (patch * patch * 4, 1))
    i = 0
    for (x, y) in [(0, 0), (w - patch, 0), (0, h - patch), (w - patch, h - patch)]:
        crop = src.crop((x, y, x + patch, y + patch))
        for px in crop.getdata():
            probe.putpixel((i, 0), px)
            i += 1
    r, g, b = probe.split()
    return (sorted(r.getdata())[len(r.getdata()) // 2],
            sorted(g.getdata())[len(g.getdata()) // 2],
            sorted(b.getdata())[len(b.getdata()) // 2])


def to_alpha(src, bg, threshold, soft):
    diff = ImageChops.difference(src, Image.new("RGB", src.size, bg))
    r, g, b = diff.split()
    # 取三通道最大值，避免只抠掉一个通道
    m = ImageChops.lighter(ImageChops.lighter(r, g), b)
    hi = max(soft, threshold + 1)
    scale = 255.0 / (hi - threshold)

    def f(v):
        if v <= threshold:
            return 0
        if v >= hi:
            return 255
        return int((v - threshold) * scale)

    return m.point(f)


def center_square(img, pad_ratio):
    bbox = img.getbbox()
    if not bbox:
        raise ValueError("图像中没有可识别的图形内容")
    content = img.crop(bbox)
    cw, ch = content.size
    side = int(max(cw, ch) * pad_ratio)
    side = max(side, 1)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(content, ((side - cw) // 2, (side - ch) // 2), content)
    return canvas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--output", required=True)
    ap.add_argument("--size", type=int, required=True)
    ap.add_argument("--threshold", type=int, default=10)
    ap.add_argument("--soft", type=int, default=60)
    ap.add_argument("--pad", type=float, default=1.12)
    args = ap.parse_args()

    src = Image.open(args.input).convert("RGB")
    bg = background_color(src)
    alpha = to_alpha(src, bg, args.threshold, args.soft)

    rgba = src.convert("RGBA")
    rgba.putalpha(alpha)
    square = center_square(rgba, args.pad)
    result = square.resize((args.size, args.size), Image.LANCZOS)
    result.save(args.output, "PNG")

    non_transparent = sum(1 for p in result.getdata() if p[3] > 8)
    ratio = non_transparent / float(args.size * args.size)
    print("OK %s bg=%s size=%s coverage=%.1f%%" % (args.output, bg, args.size, ratio * 100))


if __name__ == "__main__":
    main()
