from pathlib import Path
import struct
import zlib

ROOT = Path(r"D:\ClaudeWork\HotBreakthrough\assets\ui")
EXPECTED = {
    "panel_main.png": (1024, 640),
    "panel_upgrade.png": (560, 760),
    "button_primary.png": (512, 144),
    "hud_health.png": (720, 96),
    "hud_heat.png": (1120, 128),
    "hud_boss.png": (1520, 112),
    "hud_score.png": (672, 192),
    "dash_ring.png": (192, 192),
    "crosshair.png": (128, 128),
    "overlay_warning.png": (1024, 256),
    "icon_pulse.png": (256, 256),
    "icon_swarm.png": (256, 256),
    "icon_rail.png": (256, 256),
    "icon_valve.png": (192, 192),
    "icon_vent_burst.png": (192, 192),
    "icon_burn.png": (192, 192),
    "icon_dash_hit.png": (192, 192),
    "icon_dash_cd.png": (192, 192),
    "icon_dash_echo.png": (192, 192),
    "icon_double_jump.png": (192, 192),
    "icon_air_damage.png": (192, 192),
    "icon_rapid.png": (192, 192),
    "icon_crit.png": (192, 192),
    "icon_bounce.png": (192, 192),
    "icon_pierce.png": (192, 192),
}
CENTER_TRANSPARENT = {"dash_ring.png", "crosshair.png", "overlay_warning.png"}


def decode_rgba(path):
    data = path.read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", f"Invalid PNG: {path.name}"
    pos = 8
    compressed = bytearray()
    header = None
    while pos < len(data):
        length = struct.unpack(">I", data[pos:pos + 4])[0]
        kind = data[pos + 4:pos + 8]
        payload = data[pos + 8:pos + 8 + length]
        pos += 12 + length
        if kind == b"IHDR":
            header = struct.unpack(">IIBBBBB", payload)
        elif kind == b"IDAT":
            compressed.extend(payload)
        elif kind == b"IEND":
            break
    assert header is not None
    width, height, depth, color_type, compression, filtering, interlace = header
    assert depth == 8 and color_type == 6 and interlace == 0, (
        f"Expected non-interlaced 8-bit RGBA: {path.name}, IHDR={header}"
    )
    raw = zlib.decompress(bytes(compressed))
    stride = width * 4
    rows = []
    previous = bytearray(stride)
    offset = 0

    def paeth(a, b, c):
        p = a + b - c
        pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
        return a if pa <= pb and pa <= pc else b if pb <= pc else c

    for _ in range(height):
        filter_type = raw[offset]
        offset += 1
        source = raw[offset:offset + stride]
        offset += stride
        row = bytearray(stride)
        for i, value in enumerate(source):
            left = row[i - 4] if i >= 4 else 0
            up = previous[i]
            upper_left = previous[i - 4] if i >= 4 else 0
            if filter_type == 0:
                predictor = 0
            elif filter_type == 1:
                predictor = left
            elif filter_type == 2:
                predictor = up
            elif filter_type == 3:
                predictor = (left + up) // 2
            elif filter_type == 4:
                predictor = paeth(left, up, upper_left)
            else:
                raise ValueError(f"Unsupported PNG filter {filter_type}: {path.name}")
            row[i] = (value + predictor) & 255
        rows.append(row)
        previous = row
    return width, height, rows


def alpha(rows, x, y):
    return rows[y][x * 4 + 3]


def main():
    errors = []
    actual = {p.name for p in ROOT.glob("*.png")}
    for name in sorted(set(EXPECTED) - actual):
        errors.append(f"Missing: {name}")
    for name in sorted(actual - set(EXPECTED)):
        errors.append(f"Unexpected: {name}")
    total_bytes = 0
    for name, expected_size in EXPECTED.items():
        path = ROOT / name
        if not path.exists():
            continue
        total_bytes += path.stat().st_size
        try:
            width, height, rows = decode_rgba(path)
            if (width, height) != expected_size:
                errors.append(f"Size mismatch: {name} = {width}x{height}")
            corners = [(0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)]
            if any(alpha(rows, x, y) != 0 for x, y in corners):
                errors.append(f"Nontransparent corner: {name}")
            if name in CENTER_TRANSPARENT and alpha(rows, width // 2, height // 2) != 0:
                errors.append(f"Center not transparent: {name}")
        except Exception as exc:
            errors.append(str(exc))
    if errors:
        raise SystemExit("VALIDATION FAILED\n" + "\n".join(errors))
    print(f"PASS: {len(EXPECTED)}/25 assets")
    print("PASS: exact dimensions, 8-bit non-interlaced RGBA, transparent corners")
    print("PASS: dash_ring/crosshair/overlay_warning centers fully transparent")
    print(f"Total PNG size: {total_bytes:,} bytes")


if __name__ == "__main__":
    main()
