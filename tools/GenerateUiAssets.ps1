Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = "Stop"

$Root = "D:\ClaudeWork\HotBreakthrough"
$OutDir = Join-Path $Root "assets\ui"
$PreviewDir = Join-Path $Root "preview"

$BG_DEEP = "081018"
$BG_PANEL = "111C26"
$CYAN = "39D9E6"
$CYAN_LIGHT = "8CF5FF"
$HEAT = "FFB547"
$PERFECT = "FFD166"
$DANGER = "FF4D4D"
$WARNING = "FF7849"
$TEXT = "E8F3F5"
$TEXT_MUTED = "89A4AE"

function C([string]$Hex, [int]$Alpha = 255) {
    return [System.Drawing.Color]::FromArgb($Alpha, [Convert]::ToInt32($Hex.Substring(0,2),16), [Convert]::ToInt32($Hex.Substring(2,2),16), [Convert]::ToInt32($Hex.Substring(4,2),16))
}

function New-Pen($Color, [float]$Width = 2) {
    $p = New-Object System.Drawing.Pen -ArgumentList $Color,$Width
    $p.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $p.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $p.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    return $p
}

function New-Brush($Color) {
    return New-Object System.Drawing.SolidBrush -ArgumentList $Color
}

function New-Img([int]$W, [int]$H) {
    $bmp = [System.Drawing.Bitmap]::new($W,$H,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    return @{ Bitmap = $bmp; Graphics = $g; Width = $W; Height = $H }
}

function Save-Img($Img, [string]$Name) {
    $path = Join-Path $OutDir $Name
    $Img.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $Img.Graphics.Dispose()
    $Img.Bitmap.Dispose()
    Write-Output $path
}

function Line($G, [float]$X1, [float]$Y1, [float]$X2, [float]$Y2, $Color, [float]$Width = 2) {
    $p = New-Pen $Color $Width
    $G.DrawLine($p, $X1, $Y1, $X2, $Y2)
    $p.Dispose()
}

function Rect($G, [float]$X, [float]$Y, [float]$W, [float]$H, $Fill, $Stroke, [float]$Width = 2) {
    if ($null -ne $Fill) { $b = New-Brush $Fill; $G.FillRectangle($b,$X,$Y,$W,$H); $b.Dispose() }
    if ($null -ne $Stroke) { $p = New-Pen $Stroke $Width; $G.DrawRectangle($p,$X,$Y,$W,$H); $p.Dispose() }
}

function Ellipse($G, [float]$X, [float]$Y, [float]$W, [float]$H, $Fill, $Stroke, [float]$Width = 2) {
    if ($null -ne $Fill) { $b = New-Brush $Fill; $G.FillEllipse($b,$X,$Y,$W,$H); $b.Dispose() }
    if ($null -ne $Stroke) { $p = New-Pen $Stroke $Width; $G.DrawEllipse($p,$X,$Y,$W,$H); $p.Dispose() }
}

function Arc($G, [float]$X, [float]$Y, [float]$W, [float]$H, [float]$Start, [float]$Sweep, $Color, [float]$Width = 2) {
    $p = New-Pen $Color $Width
    $G.DrawArc($p,$X,$Y,$W,$H,$Start,$Sweep)
    $p.Dispose()
}

function Poly($G, [System.Drawing.PointF[]]$Points, $Fill, $Stroke, [float]$Width = 2) {
    if ($null -ne $Fill) { $b = New-Brush $Fill; $G.FillPolygon($b,$Points); $b.Dispose() }
    if ($null -ne $Stroke) { $p = New-Pen $Stroke $Width; $p.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Miter; $G.DrawPolygon($p,$Points); $p.Dispose() }
}

function Chamfer([float]$X, [float]$Y, [float]$W, [float]$H, [float]$Cut) {
    return [System.Drawing.PointF[]]@(
        [System.Drawing.PointF]::new($X+$Cut,$Y),
        [System.Drawing.PointF]::new($X+$W-$Cut,$Y),
        [System.Drawing.PointF]::new($X+$W,$Y+$Cut),
        [System.Drawing.PointF]::new($X+$W,$Y+$H-$Cut),
        [System.Drawing.PointF]::new($X+$W-$Cut,$Y+$H),
        [System.Drawing.PointF]::new($X+$Cut,$Y+$H),
        [System.Drawing.PointF]::new($X,$Y+$H-$Cut),
        [System.Drawing.PointF]::new($X,$Y+$Cut)
    )
}

function ChamferBox($G, [float]$X, [float]$Y, [float]$W, [float]$H, [float]$Cut, $Fill, $Stroke, [float]$Width = 2) {
    Poly $G (Chamfer $X $Y $W $H $Cut) $Fill $Stroke $Width
}

function GlowLine($G, [float]$X1, [float]$Y1, [float]$X2, [float]$Y2, $Color, [float]$Width = 3) {
    Line $G $X1 $Y1 $X2 $Y2 ([System.Drawing.Color]::FromArgb(18,$Color.R,$Color.G,$Color.B)) ($Width+12)
    Line $G $X1 $Y1 $X2 $Y2 ([System.Drawing.Color]::FromArgb(35,$Color.R,$Color.G,$Color.B)) ($Width+6)
    Line $G $X1 $Y1 $X2 $Y2 $Color $Width
}

function GlowEllipse($G, [float]$X, [float]$Y, [float]$W, [float]$H, $Color, [float]$Width = 3) {
    Ellipse $G ($X-3) ($Y-3) ($W+6) ($H+6) $null ([System.Drawing.Color]::FromArgb(24,$Color.R,$Color.G,$Color.B)) ($Width+8)
    Ellipse $G $X $Y $W $H $null $Color $Width
}

function ArrowHead($G, [float]$X, [float]$Y, [float]$Angle, [float]$Size, $Color) {
    $a = [Math]::PI * $Angle / 180.0
    $p1 = [System.Drawing.PointF]::new($X,$Y)
    $p2 = [System.Drawing.PointF]::new($X - $Size*[Math]::Cos($a-0.52), $Y - $Size*[Math]::Sin($a-0.52))
    $p3 = [System.Drawing.PointF]::new($X - $Size*[Math]::Cos($a+0.52), $Y - $Size*[Math]::Sin($a+0.52))
    Poly $G ([System.Drawing.PointF[]]@($p1,$p2,$p3)) $Color $null
}

function Arrow($G, [float]$X1, [float]$Y1, [float]$X2, [float]$Y2, $Color, [float]$Width = 4, [float]$Head = 12) {
    Line $G $X1 $Y1 $X2 $Y2 $Color $Width
    $angle = [Math]::Atan2($Y2-$Y1,$X2-$X1)*180.0/[Math]::PI
    ArrowHead $G $X2 $Y2 $angle $Head $Color
}

function CornerCircuits($G, [float]$W, [float]$H, [float]$Inset, $Accent) {
    $cyanDim = C $CYAN 105
    $muted = C $TEXT_MUTED 85
    Line $G ($Inset+34) ($Inset+18) ($Inset+116) ($Inset+18) $cyanDim 2
    Line $G ($Inset+34) ($Inset+18) ($Inset+34) ($Inset+54) $cyanDim 2
    Ellipse $G ($Inset+111) ($Inset+13) 10 10 (C $Accent 210) $null
    Line $G ($W-$Inset-130) ($H-$Inset-20) ($W-$Inset-36) ($H-$Inset-20) $cyanDim 2
    Line $G ($W-$Inset-36) ($H-$Inset-56) ($W-$Inset-36) ($H-$Inset-20) $cyanDim 2
    Ellipse $G ($W-$Inset-140) ($H-$Inset-25) 10 10 $null $muted 2
    Line $G ($W-$Inset-92) ($Inset+30) ($W-$Inset-34) ($Inset+30) $muted 2
    Line $G ($W-$Inset-34) ($Inset+30) ($W-$Inset-34) ($Inset+62) $muted 2
    Line $G ($Inset+24) ($H-$Inset-92) ($Inset+24) ($H-$Inset-34) $muted 2
}

function DrawBadge($G, [string]$Route = "cyan") {
    $accent = C $CYAN 150
    if ($Route -eq "heat") { $accent = C $HEAT 170 }
    if ($Route -eq "light") { $accent = C $CYAN_LIGHT 160 }
    ChamferBox $G 12 12 168 168 24 (C $BG_PANEL 178) (C $CYAN 95) 2
    ChamferBox $G 20 20 152 152 20 $null (C $TEXT_MUTED 50) 1
    Line $G 36 20 76 20 $accent 3
    Line $G 116 172 156 172 $accent 3
    Ellipse $G 24 34 6 6 $accent $null
    Ellipse $G 162 152 6 6 $accent $null
}

# 1. Main scalable panel
$img = New-Img 1024 640; $g = $img.Graphics
ChamferBox $g 8 8 1008 624 34 (C $CYAN 18) $null
ChamferBox $g 14 14 996 612 32 (C $BG_PANEL 232) (C $CYAN 190) 4
ChamferBox $g 26 26 972 588 26 $null (C $TEXT_MUTED 90) 2
ChamferBox $g 34 34 956 572 22 $null (C $CYAN 45) 1
CornerCircuits $g 1024 640 42 $HEAT
Line $g 188 44 824 44 (C $CYAN 48) 2
Line $g 200 596 812 596 (C $CYAN 40) 2
Poly $g ([System.Drawing.PointF[]]@([System.Drawing.PointF]::new(42,42),[System.Drawing.PointF]::new(96,42),[System.Drawing.PointF]::new(42,96))) (C $CYAN 25) $null
Poly $g ([System.Drawing.PointF[]]@([System.Drawing.PointF]::new(982,598),[System.Drawing.PointF]::new(928,598),[System.Drawing.PointF]::new(982,544))) (C $HEAT 28) $null
Save-Img $img "panel_main.png"

# 2. Upgrade card frame
$img = New-Img 560 760; $g = $img.Graphics
ChamferBox $g 8 8 544 744 30 (C $CYAN 16) $null
ChamferBox $g 14 14 532 732 28 (C $BG_PANEL 235) (C $CYAN 195) 4
ChamferBox $g 28 28 504 704 22 $null (C $TEXT_MUTED 85) 2
Line $g 48 258 512 258 (C $CYAN 100) 2
Line $g 48 548 512 548 (C $CYAN 100) 2
Line $g 78 268 482 268 (C $TEXT_MUTED 45) 1
Line $g 78 538 482 538 (C $TEXT_MUTED 45) 1
ChamferBox $g 180 72 200 152 28 (C $BG_DEEP 110) (C $CYAN 65) 2
Arc $g 198 88 164 120 195 150 (C $CYAN 50) 2
Line $g 48 48 128 48 (C $HEAT 175) 4
Line $g 432 712 512 712 (C $CYAN 170) 4
CornerCircuits $g 560 760 34 $PERFECT
Save-Img $img "panel_upgrade.png"

# 3. Primary button normal state
$img = New-Img 512 144; $g = $img.Graphics
ChamferBox $g 6 6 500 132 20 (C $CYAN 15) $null
ChamferBox $g 10 10 492 124 18 (C $BG_PANEL 242) (C $CYAN 220) 4
ChamferBox $g 20 20 472 104 14 $null (C $CYAN_LIGHT 75) 2
Line $g 52 30 174 30 (C $CYAN 80) 2
Line $g 338 114 460 114 (C $CYAN 80) 2
Poly $g ([System.Drawing.PointF[]]@([System.Drawing.PointF]::new(28,72),[System.Drawing.PointF]::new(42,58),[System.Drawing.PointF]::new(42,86))) (C $HEAT 220) $null
Poly $g ([System.Drawing.PointF[]]@([System.Drawing.PointF]::new(484,72),[System.Drawing.PointF]::new(470,58),[System.Drawing.PointF]::new(470,86))) (C $CYAN 180) $null
Save-Img $img "button_primary.png"

# 4. HP HUD frame, empty dynamic track
$img = New-Img 720 96; $g = $img.Graphics
ChamferBox $g 4 4 712 88 16 (C $BG_PANEL 230) (C $CYAN 190) 3
ChamferBox $g 12 12 696 72 12 $null (C $TEXT_MUTED 65) 1
ChamferBox $g 104 24 584 48 10 (C $BG_DEEP 190) (C $CYAN 90) 2
$heart = [System.Drawing.PointF[]]@([System.Drawing.PointF]::new(52,28),[System.Drawing.PointF]::new(64,20),[System.Drawing.PointF]::new(78,26),[System.Drawing.PointF]::new(82,40),[System.Drawing.PointF]::new(52,68),[System.Drawing.PointF]::new(22,40),[System.Drawing.PointF]::new(26,26),[System.Drawing.PointF]::new(40,20))
Poly $g $heart (C $CYAN 45) (C $CYAN_LIGHT 225) 3
Line $g 52 30 52 57 (C $CYAN_LIGHT 220) 3
Line $g 40 43 64 43 (C $CYAN_LIGHT 220) 3
Line $g 120 32 152 32 (C $CYAN 45) 2
Save-Img $img "hud_health.png"

# 5. Heat HUD frame, no baked fill or thresholds
$img = New-Img 1120 128; $g = $img.Graphics
ChamferBox $g 4 4 1112 120 20 (C $BG_PANEL 232) (C $CYAN 180) 3
ChamferBox $g 14 14 1092 100 15 $null (C $TEXT_MUTED 70) 1
ChamferBox $g 34 38 1052 54 10 (C $BG_DEEP 195) (C $CYAN 85) 2
for ($x=64; $x -le 160; $x+=24) { Line $g $x 20 ($x+12) 20 (C $HEAT 115) 3 }
for ($x=960; $x -le 1056; $x+=24) { Line $g $x 108 ($x+12) 108 (C $CYAN 90) 3 }
Poly $g ([System.Drawing.PointF[]]@([System.Drawing.PointF]::new(16,64),[System.Drawing.PointF]::new(28,52),[System.Drawing.PointF]::new(28,76))) (C $HEAT 170) $null
Poly $g ([System.Drawing.PointF[]]@([System.Drawing.PointF]::new(1104,64),[System.Drawing.PointF]::new(1092,52),[System.Drawing.PointF]::new(1092,76))) (C $CYAN 140) $null
Save-Img $img "hud_heat.png"

# 6. Boss HUD frame, heavier industrial silhouette
$img = New-Img 1520 112; $g = $img.Graphics
ChamferBox $g 4 4 1512 104 24 (C $BG_PANEL 240) (C $DANGER 175) 4
ChamferBox $g 14 14 1492 84 18 $null (C $WARNING 100) 2
ChamferBox $g 62 30 1396 52 10 (C $BG_DEEP 210) (C $TEXT_MUTED 95) 2
for ($i=0; $i -lt 3; $i++) {
    $x = 22 + $i*12
    Poly $g ([System.Drawing.PointF[]]@([System.Drawing.PointF]::new($x,56),[System.Drawing.PointF]::new($x+10,42),[System.Drawing.PointF]::new($x+10,70))) (C $DANGER (160-$i*30)) $null
    $xr = 1498 - $i*12
    Poly $g ([System.Drawing.PointF[]]@([System.Drawing.PointF]::new($xr,56),[System.Drawing.PointF]::new($xr-10,42),[System.Drawing.PointF]::new($xr-10,70))) (C $DANGER (160-$i*30)) $null
}
Line $g 86 22 226 22 (C $DANGER 125) 3
Line $g 1294 90 1434 90 (C $WARNING 110) 3
Save-Img $img "hud_boss.png"

# 7. Score and combo frame
$img = New-Img 672 192; $g = $img.Graphics
ChamferBox $g 4 4 664 184 20 (C $BG_PANEL 230) (C $CYAN 185) 3
ChamferBox $g 14 14 644 164 15 $null (C $TEXT_MUTED 65) 1
Line $g 34 94 638 94 (C $CYAN 65) 2
Line $g 42 104 630 104 (C $TEXT_MUTED 35) 1
Poly $g ([System.Drawing.PointF[]]@([System.Drawing.PointF]::new(628,28),[System.Drawing.PointF]::new(644,44),[System.Drawing.PointF]::new(628,60),[System.Drawing.PointF]::new(612,44))) (C $HEAT 45) (C $HEAT 180) 2
Line $g 36 30 142 30 (C $CYAN 110) 3
Line $g 530 162 636 162 (C $CYAN 85) 3
Save-Img $img "hud_score.png"

# 8. Dash cooldown ring, transparent center
$img = New-Img 192 192; $g = $img.Graphics
GlowEllipse $g 22 22 148 148 (C $CYAN 65) 3
Arc $g 28 28 136 136 292 76 (C $CYAN_LIGHT 235) 5
Arc $g 28 28 136 136 22 76 (C $CYAN 220) 5
Arc $g 28 28 136 136 112 76 (C $CYAN 220) 5
Arc $g 28 28 136 136 202 76 (C $CYAN 220) 5
Ellipse $g 42 42 108 108 $null (C $TEXT_MUTED 70) 2
for ($a=0; $a -lt 360; $a+=45) {
    $r = [Math]::PI*$a/180.0
    $x1 = 96 + 72*[Math]::Cos($r); $y1 = 96 + 72*[Math]::Sin($r)
    $x2 = 96 + 80*[Math]::Cos($r); $y2 = 96 + 80*[Math]::Sin($r)
    Line $g $x1 $y1 $x2 $y2 (C $CYAN_LIGHT 180) 3
}
Save-Img $img "dash_ring.png"

# 9. Crosshair, center kept open
$img = New-Img 128 128; $g = $img.Graphics
Arc $g 26 26 76 76 300 48 (C $CYAN_LIGHT 230) 3
Arc $g 26 26 76 76 30 48 (C $CYAN_LIGHT 230) 3
Arc $g 26 26 76 76 120 48 (C $CYAN_LIGHT 230) 3
Arc $g 26 26 76 76 210 48 (C $CYAN_LIGHT 230) 3
Line $g 64 10 64 34 (C $CYAN 230) 3
Line $g 64 94 64 118 (C $CYAN 230) 3
Line $g 10 64 34 64 (C $CYAN 230) 3
Line $g 94 64 118 64 (C $CYAN 230) 3
Save-Img $img "crosshair.png"

# 10. Overheat / Boss warning edge overlay
$img = New-Img 1024 256; $g = $img.Graphics
ChamferBox $g 6 6 1012 244 28 $null (C $DANGER 155) 4
ChamferBox $g 18 18 988 220 22 $null (C $WARNING 70) 2
Line $g 72 30 330 30 (C $DANGER 220) 5
Line $g 694 30 952 30 (C $DANGER 220) 5
Line $g 72 226 330 226 (C $WARNING 170) 3
Line $g 694 226 952 226 (C $WARNING 170) 3
for ($i=0; $i -lt 4; $i++) {
    $x = 34 + $i*20
    Poly $g ([System.Drawing.PointF[]]@([System.Drawing.PointF]::new($x,128),[System.Drawing.PointF]::new($x+16,108),[System.Drawing.PointF]::new($x+16,148))) (C $DANGER (220-$i*35)) $null
    $xr = 990 - $i*20
    Poly $g ([System.Drawing.PointF[]]@([System.Drawing.PointF]::new($xr,128),[System.Drawing.PointF]::new($xr-16,108),[System.Drawing.PointF]::new($xr-16,148))) (C $DANGER (220-$i*35)) $null
}
Save-Img $img "overlay_warning.png"

# Shared weapon details
function WeaponCircuit($G, [float]$X, [float]$Y, [float]$Length, $Accent) {
    Line $G $X $Y ($X+$Length) $Y $Accent 3
    Ellipse $G ($X+$Length-5) ($Y-5) 10 10 (C $CYAN_LIGHT 220) $null
}

# 11. Pulse rifle original side silhouette
$img = New-Img 256 256; $g = $img.Graphics
Poly $g ([System.Drawing.PointF[]]@([System.Drawing.PointF]::new(22,102),[System.Drawing.PointF]::new(48,82),[System.Drawing.PointF]::new(84,82),[System.Drawing.PointF]::new(92,94),[System.Drawing.PointF]::new(50,116),[System.Drawing.PointF]::new(24,116))) (C $BG_PANEL 245) (C $CYAN 210) 3
ChamferBox $g 70 76 116 62 12 (C $BG_PANEL 250) (C $CYAN_LIGHT 225) 3
Poly $g ([System.Drawing.PointF[]]@([System.Drawing.PointF]::new(104,136),[System.Drawing.PointF]::new(132,136),[System.Drawing.PointF]::new(122,184),[System.Drawing.PointF]::new(96,184))) (C $BG_PANEL 250) (C $CYAN 205) 3
Rect $g 176 88 58 15 (C $BG_PANEL 245) (C $CYAN 205) 3
Rect $g 184 110 44 12 (C $BG_PANEL 245) (C $CYAN 170) 2
Rect $g 228 86 12 20 (C $CYAN 75) (C $CYAN_LIGHT 225) 2
WeaponCircuit $g 94 92 66 (C $CYAN 220)
Rect $g 88 108 70 12 (C $CYAN 55) (C $CYAN_LIGHT 160) 2
for ($x=96; $x -le 144; $x+=16) { Line $g $x 110 $x 118 (C $CYAN_LIGHT 190) 2 }
Line $g 100 150 122 150 (C $TEXT_MUTED 125) 2
Line $g 98 162 120 162 (C $TEXT_MUTED 125) 2
Poly $g ([System.Drawing.PointF[]]@([System.Drawing.PointF]::new(70,84),[System.Drawing.PointF]::new(82,66),[System.Drawing.PointF]::new(142,66),[System.Drawing.PointF]::new(154,76))) (C $BG_PANEL 230) (C $CYAN 145) 2
Rect $g 154 128 20 8 (C $HEAT 190) $null
Save-Img $img "icon_pulse.png"

# 12. Swarm shotgun original side silhouette
$img = New-Img 256 256; $g = $img.Graphics
Poly $g ([System.Drawing.PointF[]]@([System.Drawing.PointF]::new(18,102),[System.Drawing.PointF]::new(42,82),[System.Drawing.PointF]::new(78,84),[System.Drawing.PointF]::new(92,100),[System.Drawing.PointF]::new(56,124),[System.Drawing.PointF]::new(20,120))) (C $BG_PANEL 245) (C $CYAN 180) 3
ChamferBox $g 66 72 122 78 14 (C $BG_PANEL 250) (C $HEAT 220) 3
Poly $g ([System.Drawing.PointF[]]@([System.Drawing.PointF]::new(102,148),[System.Drawing.PointF]::new(134,148),[System.Drawing.PointF]::new(126,190),[System.Drawing.PointF]::new(98,190))) (C $BG_PANEL 250) (C $CYAN 180) 3
Rect $g 174 80 58 18 (C $BG_PANEL 250) (C $HEAT 230) 3
Rect $g 180 104 58 18 (C $BG_PANEL 250) (C $HEAT 230) 3
Rect $g 174 128 58 18 (C $BG_PANEL 250) (C $HEAT 230) 3
Ellipse $g 224 82 16 14 (C $BG_DEEP 255) (C $PERFECT 225) 2
Ellipse $g 230 106 16 14 (C $BG_DEEP 255) (C $PERFECT 225) 2
Ellipse $g 224 130 16 14 (C $BG_DEEP 255) (C $PERFECT 225) 2
WeaponCircuit $g 88 90 60 (C $CYAN 190)
for ($x=88; $x -le 152; $x+=16) { Line $g $x 112 ($x+8) 124 (C $HEAT 185) 3 }
Line $g 104 162 126 162 (C $TEXT_MUTED 115) 2
Line $g 102 174 124 174 (C $TEXT_MUTED 115) 2
Poly $g ([System.Drawing.PointF[]]@([System.Drawing.PointF]::new(72,72),[System.Drawing.PointF]::new(88,58),[System.Drawing.PointF]::new(152,58),[System.Drawing.PointF]::new(166,72))) (C $BG_PANEL 235) (C $CYAN 125) 2
Save-Img $img "icon_swarm.png"

# 13. Railgun original side silhouette
$img = New-Img 256 256; $g = $img.Graphics
Poly $g ([System.Drawing.PointF[]]@([System.Drawing.PointF]::new(14,112),[System.Drawing.PointF]::new(44,88),[System.Drawing.PointF]::new(78,90),[System.Drawing.PointF]::new(88,106),[System.Drawing.PointF]::new(48,126),[System.Drawing.PointF]::new(18,126))) (C $BG_PANEL 245) (C $CYAN 185) 3
ChamferBox $g 64 82 116 66 10 (C $BG_PANEL 250) (C $CYAN_LIGHT 225) 3
Poly $g ([System.Drawing.PointF[]]@([System.Drawing.PointF]::new(96,146),[System.Drawing.PointF]::new(122,146),[System.Drawing.PointF]::new(116,188),[System.Drawing.PointF]::new(92,188))) (C $BG_PANEL 250) (C $CYAN 180) 3
Rect $g 158 70 82 13 (C $BG_PANEL 245) (C $CYAN_LIGHT 230) 3
Rect $g 158 132 82 13 (C $BG_PANEL 245) (C $CYAN_LIGHT 230) 3
Line $g 168 108 244 108 (C $CYAN_LIGHT 245) 4
Line $g 184 114 244 114 (C $CYAN 155) 2
for ($x=166; $x -le 222; $x+=14) {
    Line $g $x 84 ($x+8) 98 (C $CYAN 180) 3
    Line $g $x 118 ($x+8) 132 (C $CYAN 180) 3
}
WeaponCircuit $g 84 100 58 (C $CYAN_LIGHT 220)
Rect $g 82 116 64 10 (C $CYAN 55) (C $CYAN 150) 2
Poly $g ([System.Drawing.PointF[]]@([System.Drawing.PointF]::new(74,82),[System.Drawing.PointF]::new(90,64),[System.Drawing.PointF]::new(136,64),[System.Drawing.PointF]::new(150,82))) (C $BG_PANEL 230) (C $CYAN 130) 2
Rect $g 134 146 26 7 (C $CYAN_LIGHT 200) $null
Save-Img $img "icon_rail.png"

# 14. Upgrade: expanded safety valve
$img = New-Img 192 192; $g = $img.Graphics; DrawBadge $g "heat"
Arc $g 36 36 120 120 300 120 (C $PERFECT 235) 7
Arc $g 44 44 104 104 300 120 (C $HEAT 90) 3
Ellipse $g 68 68 56 56 (C $BG_DEEP 190) (C $CYAN 200) 4
Ellipse $g 86 86 20 20 (C $HEAT 100) (C $PERFECT 235) 3
for ($a=0; $a -lt 360; $a+=60) { $r=[Math]::PI*$a/180; Line $g (96+12*[Math]::Cos($r)) (96+12*[Math]::Sin($r)) (96+30*[Math]::Cos($r)) (96+30*[Math]::Sin($r)) (C $CYAN_LIGHT 190) 3 }
Line $g 96 38 96 22 (C $PERFECT 230) 5
Line $g 78 24 114 24 (C $PERFECT 230) 5
Save-Img $img "icon_valve.png"

# 15. Upgrade: vent burst
$img = New-Img 192 192; $g = $img.Graphics; DrawBadge $g "heat"
GlowEllipse $g 72 72 48 48 (C $PERFECT 235) 4
Ellipse $g 84 84 24 24 (C $HEAT 190) (C $CYAN_LIGHT 220) 3
Arc $g 52 52 88 88 20 290 (C $HEAT 210) 5
Arc $g 32 32 128 128 200 250 (C $PERFECT 155) 4
for ($a=0; $a -lt 360; $a+=45) { $r=[Math]::PI*$a/180; Line $g (96+60*[Math]::Cos($r)) (96+60*[Math]::Sin($r)) (96+72*[Math]::Cos($r)) (96+72*[Math]::Sin($r)) (C $HEAT 195) 4 }
Save-Img $img "icon_vent_burst.png"

# 16. Upgrade: burning aftermath
$img = New-Img 192 192; $g = $img.Graphics; DrawBadge $g "heat"
$flame = [System.Drawing.PointF[]]@([System.Drawing.PointF]::new(96,36),[System.Drawing.PointF]::new(112,64),[System.Drawing.PointF]::new(108,82),[System.Drawing.PointF]::new(128,68),[System.Drawing.PointF]::new(136,104),[System.Drawing.PointF]::new(124,134),[System.Drawing.PointF]::new(96,150),[System.Drawing.PointF]::new(66,134),[System.Drawing.PointF]::new(56,104),[System.Drawing.PointF]::new(68,72),[System.Drawing.PointF]::new(78,92))
Poly $g $flame (C $HEAT 90) (C $HEAT 230) 4
Poly $g ([System.Drawing.PointF[]]@([System.Drawing.PointF]::new(98,78),[System.Drawing.PointF]::new(112,104),[System.Drawing.PointF]::new(104,130),[System.Drawing.PointF]::new(88,136),[System.Drawing.PointF]::new(76,116),[System.Drawing.PointF]::new(82,94))) (C $PERFECT 150) (C $PERFECT 220) 2
Arc $g 42 104 108 46 15 150 (C $CYAN 150) 3
Arc $g 52 116 88 36 15 150 (C $HEAT 180) 3
Save-Img $img "icon_burn.png"

# 17. Upgrade: phase dash hit
$img = New-Img 192 192; $g = $img.Graphics; DrawBadge $g "cyan"
for ($i=0; $i -lt 3; $i++) { $x=30+$i*20; Poly $g ([System.Drawing.PointF[]]@([System.Drawing.PointF]::new($x,96),[System.Drawing.PointF]::new($x+24,72),[System.Drawing.PointF]::new($x+24,86),[System.Drawing.PointF]::new($x+46,86),[System.Drawing.PointF]::new($x+46,106),[System.Drawing.PointF]::new($x+24,106),[System.Drawing.PointF]::new($x+24,120))) (C $CYAN (45+$i*45)) $null }
Poly $g ([System.Drawing.PointF[]]@([System.Drawing.PointF]::new(140,62),[System.Drawing.PointF]::new(158,96),[System.Drawing.PointF]::new(140,130),[System.Drawing.PointF]::new(122,96))) (C $DANGER 45) (C $DANGER 180) 3
Arrow $g 62 96 136 96 (C $CYAN_LIGHT 240) 5 14
Line $g 32 140 110 140 (C $CYAN 95) 3
Save-Img $img "icon_dash_hit.png"

# 18. Upgrade: dash capacitor
$img = New-Img 192 192; $g = $img.Graphics; DrawBadge $g "cyan"
Line $g 76 52 76 140 (C $CYAN_LIGHT 235) 6
Line $g 116 52 116 140 (C $CYAN_LIGHT 235) 6
Line $g 42 96 68 96 (C $CYAN 210) 4
Line $g 124 96 150 96 (C $CYAN 210) 4
Arc $g 38 34 116 124 205 120 (C $HEAT 200) 4
ArrowHead $g 51 65 220 12 (C $HEAT 220)
Arc $g 38 34 116 124 25 120 (C $CYAN 190) 4
ArrowHead $g 141 127 40 12 (C $CYAN 220)
Line $g 54 48 66 48 (C $TEXT_MUTED 125) 2
Line $g 126 144 138 144 (C $TEXT_MUTED 125) 2
Save-Img $img "icon_dash_cd.png"

# 19. Upgrade: dash echo
$img = New-Img 192 192; $g = $img.Graphics; DrawBadge $g "cyan"
Arrow $g 32 104 92 104 (C $CYAN_LIGHT 235) 5 12
Line $g 38 122 78 122 (C $CYAN 80) 3
Line $g 46 134 84 134 (C $CYAN 50) 3
Line $g 94 104 118 104 (C $CYAN 210) 4
Arrow $g 118 104 154 62 (C $HEAT 225) 4 11
Arrow $g 118 104 154 146 (C $HEAT 225) 4 11
Ellipse $g 84 94 20 20 (C $CYAN 60) (C $CYAN_LIGHT 210) 2
Save-Img $img "icon_dash_echo.png"

# 20. Upgrade: double jump
$img = New-Img 192 192; $g = $img.Graphics; DrawBadge $g "light"
Arc $g 42 126 108 32 0 360 (C $CYAN 190) 4
Ellipse $g 72 136 48 12 (C $CYAN 40) $null
Arrow $g 72 122 72 78 (C $CYAN 220) 5 14
Arrow $g 120 104 120 46 (C $CYAN_LIGHT 240) 5 14
Line $g 52 142 92 142 (C $CYAN_LIGHT 140) 2
Save-Img $img "icon_double_jump.png"

# 21. Upgrade: airborne advantage
$img = New-Img 192 192; $g = $img.Graphics; DrawBadge $g "light"
Poly $g ([System.Drawing.PointF[]]@([System.Drawing.PointF]::new(96,38),[System.Drawing.PointF]::new(114,54),[System.Drawing.PointF]::new(96,72),[System.Drawing.PointF]::new(78,54))) (C $CYAN 90) (C $CYAN_LIGHT 230) 3
Arc $g 62 22 68 68 300 60 (C $CYAN 160) 2
Arc $g 62 22 68 68 120 60 (C $CYAN 160) 2
Arrow $g 84 82 66 132 (C $HEAT 220) 4 11
Arrow $g 108 82 128 132 (C $HEAT 220) 4 11
Poly $g ([System.Drawing.PointF[]]@([System.Drawing.PointF]::new(96,128),[System.Drawing.PointF]::new(116,148),[System.Drawing.PointF]::new(96,162),[System.Drawing.PointF]::new(76,148))) (C $BG_DEEP 180) (C $CYAN 170) 3
Save-Img $img "icon_air_damage.png"

# 22. Upgrade: rapid gun mechanism
$img = New-Img 192 192; $g = $img.Graphics; DrawBadge $g "cyan"
ChamferBox $g 58 64 84 64 10 (C $BG_DEEP 200) (C $CYAN_LIGHT 220) 3
Rect $g 76 78 50 22 (C $CYAN 65) (C $CYAN 190) 2
Line $g 134 88 158 88 (C $CYAN_LIGHT 220) 5
for ($i=0; $i -lt 3; $i++) { Line $g 26 (70+$i*24) (48+$i*8) (70+$i*24) (C $CYAN (110+$i*35)) 4 }
Arc $g 48 48 104 104 195 140 (C $HEAT 190) 3
ArrowHead $g 55 69 225 11 (C $HEAT 220)
Save-Img $img "icon_rapid.png"

# 23. Upgrade: critical core
$img = New-Img 192 192; $g = $img.Graphics; DrawBadge $g "heat"
Ellipse $g 58 58 76 76 (C $BG_DEEP 200) (C $CYAN 180) 3
Ellipse $g 76 76 40 40 (C $DANGER 65) (C $PERFECT 230) 4
Poly $g ([System.Drawing.PointF[]]@([System.Drawing.PointF]::new(98,48),[System.Drawing.PointF]::new(106,76),[System.Drawing.PointF]::new(136,66),[System.Drawing.PointF]::new(116,92),[System.Drawing.PointF]::new(146,106),[System.Drawing.PointF]::new(112,108),[System.Drawing.PointF]::new(118,142),[System.Drawing.PointF]::new(96,118),[System.Drawing.PointF]::new(72,140),[System.Drawing.PointF]::new(80,108),[System.Drawing.PointF]::new(48,102),[System.Drawing.PointF]::new(78,88))) (C $HEAT 55) (C $HEAT 190) 2
Ellipse $g 88 88 16 16 (C $CYAN_LIGHT 240) $null
Save-Img $img "icon_crit.png"

# 24. Upgrade: bouncing rounds
$img = New-Img 192 192; $g = $img.Graphics; DrawBadge $g "cyan"
Ellipse $g 30 42 40 40 (C $BG_DEEP 200) (C $CYAN 210) 3
Ellipse $g 122 110 40 40 (C $BG_DEEP 200) (C $CYAN 210) 3
Line $g 54 86 98 122 (C $CYAN_LIGHT 220) 4
Arrow $g 98 122 138 106 (C $HEAT 225) 4 11
Ellipse $g 88 112 20 20 (C $HEAT 85) (C $PERFECT 210) 2
Line $g 42 62 58 62 (C $CYAN_LIGHT 130) 2
Line $g 134 130 150 130 (C $CYAN_LIGHT 130) 2
Save-Img $img "icon_bounce.png"

# 25. Upgrade: piercing core
$img = New-Img 192 192; $g = $img.Graphics; DrawBadge $g "light"
for ($i=0; $i -lt 3; $i++) { $x=42+$i*44; Poly $g ([System.Drawing.PointF[]]@([System.Drawing.PointF]::new($x,66),[System.Drawing.PointF]::new($x+18,96),[System.Drawing.PointF]::new($x,126),[System.Drawing.PointF]::new($x-18,96))) (C $CYAN 30) (C $CYAN 185) 3 }
GlowLine $g 24 96 164 96 (C $CYAN_LIGHT 235) 4
ArrowHead $g 166 96 0 14 (C $HEAT 235)
Line $g 42 48 130 48 (C $CYAN 65) 2
Save-Img $img "icon_pierce.png"

# Contact sheet for visual review only; not loaded by the game.
$files = @(
    "panel_main.png","panel_upgrade.png","button_primary.png","hud_health.png","hud_heat.png",
    "hud_boss.png","hud_score.png","dash_ring.png","crosshair.png","overlay_warning.png",
    "icon_pulse.png","icon_swarm.png","icon_rail.png","icon_valve.png","icon_vent_burst.png",
    "icon_burn.png","icon_dash_hit.png","icon_dash_cd.png","icon_dash_echo.png","icon_double_jump.png",
    "icon_air_damage.png","icon_rapid.png","icon_crit.png","icon_bounce.png","icon_pierce.png"
)
$sheet = New-Img 1400 1180; $g = $sheet.Graphics
$g.Clear((C $BG_DEEP 255))
$titleFont = [System.Drawing.Font]::new("Microsoft YaHei",24,[System.Drawing.FontStyle]::Bold)
$labelFont = [System.Drawing.Font]::new("Consolas",11,[System.Drawing.FontStyle]::Regular)
$titleBrush = New-Brush (C $TEXT 255)
$labelBrush = New-Brush (C $TEXT_MUTED 255)
$g.DrawString("AFTERHEAT / UI ASSET OVERVIEW", $titleFont, $titleBrush, 32, 20)
$g.DrawString("25 transparent PNG assets - neon industrial holographic system", $labelFont, $labelBrush, 34, 62)
for ($i=0; $i -lt $files.Count; $i++) {
    $col = $i % 5; $row = [Math]::Floor($i/5)
    $x = 28 + $col*274; $y = 96 + $row*210
    ChamferBox $g $x $y 254 186 12 (C $BG_PANEL 220) (C $CYAN 55) 1
    $bmp = [System.Drawing.Image]::FromFile((Join-Path $OutDir $files[$i]))
    $maxW = 220.0; $maxH = 140.0
    $scale = [Math]::Min($maxW/$bmp.Width, $maxH/$bmp.Height)
    $dw = $bmp.Width*$scale; $dh = $bmp.Height*$scale
    $dx = $x+(254-$dw)/2; $dy = $y+8+(140-$dh)/2
    $g.DrawImage($bmp, $dx, $dy, $dw, $dh)
    $g.DrawString($files[$i], $labelFont, $labelBrush, $x+12, $y+158)
    $bmp.Dispose()
}
$titleFont.Dispose(); $labelFont.Dispose(); $titleBrush.Dispose(); $labelBrush.Dispose()
$sheet.Bitmap.Save((Join-Path $PreviewDir "ui_assets_overview.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$sheet.Graphics.Dispose(); $sheet.Bitmap.Dispose()
Write-Output "Generated $($files.Count) UI assets and contact sheet."
