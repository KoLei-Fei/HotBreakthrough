#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""去除 Kenney 角色/怪物精灵外圈的白色描边。

做法：从透明区域向内泛洪，把与外界连通的近白像素置为透明。
只删除与外部相连的白边，精灵内部的眼白/高光会保留。

用法：
  python -I tools/StripWhiteOutline.py
"""
import sys
import os
import collections

sys.path.insert(0, r"D:\ClaudeWork\tools\pydeps")

from PIL import Image

TARGETS = [
    r"D:\ClaudeWork\HotBreakthrough\assets\game\players",
    r"D:\ClaudeWork\HotBreakthrough\assets\game\enemies",
]
THRESHOLD = 210  # 三通道都 >= 该值才算“白边”


def strip_white(img, threshold):
    im = img.convert("RGBA")
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)
    queue = collections.deque()

    def near_white(x, y):
        r, g, b, a = px[x, y]
        return a > 0 and r >= threshold and g >= threshold and b >= threshold

    # 从透明像素的 4 邻域开始，找到与外界连通的白边
    for y in range(h):
        for x in range(w):
            if px[x, y][3] != 0:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and near_white(nx, ny):
                    seen[ny * w + nx] = 1
                    queue.append((nx, ny))

    removed = 0
    while queue:
        x, y = queue.popleft()
        r, g, b, _ = px[x, y]
        px[x, y] = (r, g, b, 0)
        removed += 1
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and near_white(nx, ny):
                seen[ny * w + nx] = 1
                queue.append((nx, ny))
    return im, removed


def main():
    total = 0
    for folder in TARGETS:
        for name in sorted(os.listdir(folder)):
            if not name.endswith(".png"):
                continue
            path = os.path.join(folder, name)
            src = Image.open(path)
            out, removed = strip_white(src, THRESHOLD)
            out.save(path, "PNG")
            total += 1
            print("OK %-24s removed=%d" % (name, removed))
    print("DONE %d files" % total)


if __name__ == "__main__":
    main()
