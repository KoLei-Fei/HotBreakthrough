#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""把 Kenney 素材扁平化复制到 assets/game/，并输出映射清单。"""
import sys, os, shutil, json

BASE = r"D:\ClaudeWork\HotBreakthrough\assets\kenney_desert-shooter-pack_1.0"
DST = r"D:\ClaudeWork\HotBreakthrough\assets\game"

PICKS = {
    "players": {
        "src": r"PNG\Players\Tiles",
        "ids": list(range(8)),
        "prefix": "player"
    },
    "enemies": {
        "src": r"PNG\Enemies\Tiles",
        "ids": list(range(16)),
        "prefix": "enemy"
    },
    "weapons": {
        "src": r"PNG\Weapons\Tiles",
        "ids": [3, 13, 15, 24, 25],
        "prefix": "weapon"
    },
    "tiles": {
        "src": r"PNG\Tiles\Tiles",
        "ids": [0, 1, 4, 5, 19, 24, 39, 44, 49, 52, 53, 56, 57, 59, 63, 64, 65, 68, 69, 72, 73, 74, 76, 80, 81, 82, 83, 84, 86, 88, 89, 109, 150, 151, 168, 169, 196, 201, 202, 203, 204, 212, 216, 217],
        "prefix": "tile"
    }
}

def main():
    manifest = {}
    for cat, cfg in PICKS.items():
        outdir = os.path.join(DST, cat)
        os.makedirs(outdir, exist_ok=True)
        manifest[cat] = []
        for tid in cfg["ids"]:
            src = os.path.join(BASE, cfg["src"], "tile_%04d.png" % tid)
            if not os.path.exists(src):
                print("MISS %s" % src)
                continue
            name = "%s_%04d.png" % (cfg["prefix"], tid)
            dst = os.path.join(outdir, name)
            shutil.copy2(src, dst)
            manifest[cat].append(name)
        print("%s: %d files" % (cat, len(manifest[cat])))

    # 音效
    snd_out = os.path.join(DST, "sounds")
    os.makedirs(snd_out, exist_ok=True)
    snd_src = os.path.join(BASE, "Sounds")
    sounds = []
    for f in os.listdir(snd_src):
        if f.endswith(".ogg"):
            shutil.copy2(os.path.join(snd_src, f), os.path.join(snd_out, f))
            sounds.append(f)
    print("sounds: %d files" % len(sounds))
    manifest["sounds"] = sounds

    with open(os.path.join(DST, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print("manifest written")


if __name__ == "__main__":
    main()
