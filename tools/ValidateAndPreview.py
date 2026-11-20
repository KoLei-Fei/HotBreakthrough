#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""校验图标 PNG 并生成总览预览图。"""
import sys
import os

sys.path.insert(0, r"D:\ClaudeWork\tools\pydeps")

from PIL import Image

UI_DIR = r"D:\ClaudeWork\HotBreakthrough\assets\ui"
PREVIEW = r"D:\ClaudeWork\HotBreakthrough\preview\ui_icons_overview.png"

WEAPONS = ["icon_pulse", "icon_swarm", "icon_rail"]
UPGRADES = [
    "icon_upgrade_valve", "icon_upgrade_vent_burst", "icon_upgrade_burn",
    "icon_upgrade_dash_hit", "icon_upgrade_dash_cd", "icon_upgrade_dash_echo",
    "icon_upgrade_swift_boots", "icon_upgrade_stable_grip", "icon_upgrade_rapid",
    "icon_upgrade_crit", "icon_upgrade_bounce", "icon_upgrade_pierce",
]


def check(name):
    path = os.path.join(UI_DIR, name + ".png")
    img = Image.open(path)
    w, h = img.size
    expected = 256 if name in WEAPONS else 192
    corners = [img.getpixel((0, 0)), img.getpixel((w - 1, 0)),
               img.getpixel((0, h - 1)), img.getpixel((w - 1, h - 1))]
    ok = (img.mode == "RGBA" and w == expected and h == expected
          and all(c[3] == 0 for c in corners))
    print("%s %s mode=%s size=%dx%d" % ("OK  " if ok else "FAIL", name, img.mode, w, h))
    return ok, img


def main():
    all_ok = True
    images = {}
    for name in WEAPONS + UPGRADES:
        ok, img = check(name)
        all_ok = all_ok and ok
        images[name] = img

    bg = (17, 28, 38, 255)  # BG_PANEL
    pad, gap = 40, 24
    width = 4 * 192 + 5 * gap + 2 * pad
    y = pad
    rows = []
    row_h = 192
    height = pad + 256 + gap + 3 * (192 + gap) + pad

    canvas = Image.new("RGBA", (width, height), bg)

    # 武器行
    x = (width - (3 * 256 + 2 * gap)) // 2
    for name in WEAPONS:
        canvas.alpha_composite(images[name], (x, y))
        x += 256 + gap
    y += 256 + gap + 8

    # 升级 4x3
    for r in range(3):
        x = pad
        for c in range(4):
            name = UPGRADES[r * 4 + c]
            canvas.alpha_composite(images[name], (x, y))
            x += 192 + gap
        y += row_h + gap

    canvas.save(PREVIEW, "PNG")
    print("PREVIEW %s" % PREVIEW)
    print("ALL_OK" if all_ok else "HAS_FAIL")


if __name__ == "__main__":
    main()
