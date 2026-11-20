// render.js — 余热突围拆分模块
// ===== 绘图辅助 =====
function cutRectPath(c, x, y, w, h, cut) {
  c.beginPath();
  c.moveTo(x + cut, y);
  c.lineTo(x + w - cut, y);
  c.lineTo(x + w, y + cut);
  c.lineTo(x + w, y + h - cut);
  c.lineTo(x + w - cut, y + h);
  c.lineTo(x + cut, y + h);
  c.lineTo(x, y + h - cut);
  c.lineTo(x, y + cut);
  c.closePath();
}
function drawPanel(x, y, w, h, opts) {
  const o = opts || {};
  const cut = o.cut == null ? 14 : o.cut;
  const fill = o.fill || 'rgba(17,28,38,0.9)';
  const stroke = o.stroke || C.CYAN;
  ctx.save();
  if (o.glow) { ctx.shadowColor = stroke; ctx.shadowBlur = o.glow; }
  cutRectPath(ctx, x, y, w, h, cut);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = o.lineWidth == null ? 2 : o.lineWidth;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  ctx.restore();
}
function drawText(text, x, y, size, color, align, weight) {
  ctx.save();
  ctx.fillStyle = color || C.TEXT;
  ctx.font = (weight || 'normal') + ' ' + size + 'px "Microsoft YaHei","PingFang SC",sans-serif';
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}
function drawMono(text, x, y, size, color, align) {
  ctx.save();
  ctx.fillStyle = color || C.TEXT;
  ctx.font = size + 'px Consolas,monospace';
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}

// ===== 世界渲染（俯视） =====
function drawBackground(time) {
  ctx.fillStyle = '#1a1420';
  ctx.fillRect(0, 0, W, H);
}

function drawMap() {
  const map = Game.map || MAPS[0];
  const gImg = Assets.get(map.ground) || Assets.get('sand');
  const gImg2 = Assets.get(map.ground2) || Assets.get('sand2');
  // 大世界地面纹理优先；缺失时回退到纯色瓦片平铺
  const tex = (map.groundTexWorld && Assets.get(map.groundTexWorld)) ||
              (map.groundTex && Assets.get(map.groundTex));
  if (tex) {
    ctx.drawImage(tex, 0, 0, FIELD.right, FIELD.bottom);
  } else {
    for (let y = FIELD.top; y < FIELD.bottom; y += TILE) {
      for (let x = FIELD.left; x < FIELD.right; x += TILE) {
        const alt = ((Math.floor(x / TILE) + Math.floor(y / TILE)) % 4 === 0);
        const img = alt ? gImg2 : gImg;
        if (img) ctx.drawImage(img, x, y, TILE, TILE);
        else { ctx.fillStyle = C.SAND; ctx.fillRect(x, y, TILE, TILE); }
      }
    }
  }
  const dim = map.groundDim || 0;
  if (dim > 0) {
    ctx.fillStyle = 'rgba(20,14,26,' + dim + ')';
    ctx.fillRect(0, 0, FIELD.right, FIELD.bottom);
  }

  // 装饰（不挡路）
  for (const d of (Game.decor || map.decor || [])) {
    const hrKey = HR_PROP[d.tile];
    const img = (hrKey && Assets.get('hr_' + hrKey)) || Assets.get(d.tile);
    const size = TILE;
    ctx.save();
    ctx.globalAlpha = 0.95;
    if (img) {
      // 少量地面投影，让草丛/石块与地面有层次
      ctx.fillStyle = 'rgba(50,30,40,0.16)';
      ctx.beginPath();
      ctx.ellipse(d.x + size / 2, d.y + size - 4, size * 0.34, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(img, d.x, d.y, size, size);
    }
    ctx.restore();
  }

  // 掩体（挡路 + 挡子弹）
  for (const ob of Game.obstacles) {
    const hrKey = HR_PROP[ob.tile];
    const img = (hrKey && Assets.get('hr_' + hrKey)) || Assets.get(ob.tile);
    if (img) {
      ctx.save();
      ctx.fillStyle = 'rgba(40,20,30,0.28)';
      ctx.beginPath();
      ctx.ellipse(ob.x + ob.w / 2, ob.y + ob.h - 3, ob.w * 0.52, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(img, ob.x, ob.y, ob.w, ob.h);
      ctx.restore();
    } else {
      ctx.fillStyle = C.SAND_DARK;
      ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
    }
  }

  // 场地边界
  ctx.save();
  ctx.strokeStyle = 'rgba(255,240,220,0.25)';
  ctx.lineWidth = 3;
  ctx.strokeRect(FIELD.left, FIELD.top, FIELD.right - FIELD.left, FIELD.bottom - FIELD.top);
  ctx.restore();
}

function drawShadow(x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(40,20,30,0.35)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h + 4, w * 0.55, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// 绘制精灵；flip 时水平镜像（用于单张正面精灵表现左右朝向）
function drawSprite(img, x, y, w, h, flip) {
  if (!img) return;
  if (!flip) { ctx.drawImage(img, x, y, w, h); return; }
  ctx.save();
  ctx.translate(x + w, y);
  ctx.scale(-1, 1);
  ctx.drawImage(img, 0, 0, w, h);
  ctx.restore();
}

function playerSpriteFor(dir) {
  if (dir === 2) return Assets.get('hr_player_back') || Assets.get('hr_player');
  if (dir === 1 || dir === 3) return Assets.get('hr_player_side') || Assets.get('hr_player');
  return Assets.get('hr_player');
}

function drawPlayer() {
  const p = Game.player;
  if (!p || p.dead) return;
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  // 冲刺残影
  if (p.dashTimer > 0) {
    const dir = p.dir4 || 0;
    const img = playerSpriteFor(dir);
    for (let i = 1; i <= 3; i++) {
      ctx.save();
      ctx.globalAlpha = 0.16 - i * 0.04;
      const dx = p.x + p.w / 2 - 24 - p.dashVec.x * i * 18;
      const dy = p.y + p.h / 2 - 24 - p.dashVec.y * i * 18;
      drawSprite(img, dx, dy, 48, 48, dir === 3);
      ctx.restore();
    }
  }
  // 玩家专属光环，与敌人区分
  ctx.save();
  ctx.strokeStyle = 'rgba(168,240,230,0.85)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, p.y + p.h / 2 + 6, p.w * 0.72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  drawShadow(p.x + p.w / 2 - 24, p.y, 48, p.h);
  const dir = p.dir4 || 0;
  const img = playerSpriteFor(dir);
  ctx.save();
  if (p.invuln > 0 && Math.floor(p.invuln * 20) % 2 === 0) ctx.globalAlpha = 0.5;
  const psize = 48;
  if (img) {
    drawSprite(img, p.x + p.w / 2 - psize / 2, p.y + p.h / 2 - psize / 2, psize, psize, dir === 3);
  } else {
    ctx.fillStyle = C.CYAN;
    ctx.fillRect(p.x, p.y, p.w, p.h);
  }
  ctx.restore();

  // 枪口与瞄准方向
  const angle = aimAngleFromPlayer(p);
  const mx = cx + Math.cos(angle) * 22, my = cy + Math.sin(angle) * 22;
  ctx.save();
  ctx.strokeStyle = C.CYAN_LIGHT;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(angle) * 8, cy + Math.sin(angle) * 8);
  ctx.lineTo(mx, my);
  ctx.stroke();
  if (p.muzzleFlash > 0) {
    ctx.beginPath();
    ctx.arc(mx, my, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,220,140,0.9)';
    ctx.fill();
  }
  ctx.restore();
}

const ENEMY_SPRITE = { charger: 'charger', gunner: 'gunner', drone: 'drone', shield: 'shield', bomber: 'bomber' };

function drawEnemy(e) {
  if (!e.alive && e.deadTimer <= 0) return;
  if (e.isBoss) { drawBoss(e); return; }
  ctx.save();
  if (e.state === 'SPAWNING') {
    ctx.globalAlpha = 0.35 + Math.random() * 0.3;
    ctx.strokeStyle = C.WARNING;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(e.x - 6, e.y - 6, e.w + 12, e.h + 12);
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
    ctx.restore();
    return;
  }
  if (!e.alive) ctx.globalAlpha = Math.max(0, e.deadTimer / 0.45);
  drawShadow(e.x + e.w / 2 - 24, e.y, 48, e.h);
  if (e.elite) {
    ctx.save();
    ctx.strokeStyle = C.PERFECT;
    ctx.lineWidth = 2;
    ctx.shadowColor = C.PERFECT;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(e.x + e.w / 2, e.y + e.h / 2, Math.max(e.w, e.h) * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  const prefix = ENEMY_SPRITE[e.type] || 'charger';
  const dir = e.dir4 || 0;
  const frame = Assets.frame(prefix, dir);
  const hr = Assets.get('hr_' + prefix);
  const flip = dir === 3;
  const esize = 48;
  const dx = e.x + e.w / 2 - esize / 2, dy = e.y + e.h / 2 - esize / 2;
  if (hr) {
    drawSprite(hr, dx, dy, esize, esize, flip);
  } else if (frame) {
    drawSprite(frame, dx, dy, esize, esize, false);
  } else {
    ctx.fillStyle = e.def.color;
    ctx.fillRect(e.x, e.y, e.w, e.h);
  }
  if (e.hitFlash > 0) {
    const sil = hr ? Assets.white('hr_' + prefix) : Assets.white(prefix + '_' + dir);
    if (sil) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55;
      drawSprite(sil, dx, dy, esize, esize, flip);
      ctx.restore();
    }
  }

  // 类型特征
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  if (e.type === 'gunner' && e.state === 'AIM') {
    ctx.strokeStyle = 'rgba(255,77,77,0.45)';
    ctx.setLineDash([9, 9]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(e.aimAngle) * 700, cy + Math.sin(e.aimAngle) * 700);
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (e.type === 'shield' && e.faceV) {
    // 盾牌弧线
    const a = e.faceA || 0;
    ctx.strokeStyle = e.shieldFlash > 0 ? '#ffffff' : 'rgba(255,181,71,0.85)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, e.w * 0.62, a - 0.7, a + 0.7);
    ctx.stroke();
    if (e.state === 'MELEE_WARN') {
      ctx.strokeStyle = 'rgba(255,120,73,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 40, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (e.type === 'bomber' && e.state === 'THROW_WARN') {
    ctx.strokeStyle = 'rgba(255,120,73,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.stroke();
  } else if (e.type === 'drone' && e.state === 'FLASH' && Math.floor(e.phaseTime * 20) % 2) {
    ctx.fillStyle = 'rgba(255,77,77,0.8)';
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 灼烧
  if (e.burn > 0) {
    ctx.globalAlpha = 0.5 + Math.random() * 0.3;
    ctx.fillStyle = C.WARNING;
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(e.x + 6 + i * 9, e.y - 3 + Math.random() * 5, 4, 6);
    }
    ctx.globalAlpha = 1;
  }
  // 血条
  if (e.hp < e.maxHp && e.alive) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(e.x, e.y - 10, e.w, 4);
    ctx.fillStyle = C.DANGER;
    ctx.fillRect(e.x, e.y - 10, e.w * Math.max(0, e.hp / e.maxHp), 4);
  }
  ctx.restore();
}

function drawBoss(b) {
  const flash = b.hitFlash > 0;
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  ctx.save();
  if (b.coreExposed) {
    ctx.beginPath();
    ctx.arc(cx, cy, 58, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,209,102,0.2)';
    ctx.fill();
  }
  drawShadow(b.x, b.y, b.w, b.h);
  const img = Assets.get('boss');
  const bsize = Math.max(b.w, b.h) + 10;
  const bx = b.x + b.w / 2 - bsize / 2, by = b.y + b.h / 2 - bsize / 2;
  if (img) {
    // Boss 是 96px 高精度图，缩放时保留平滑，避免像素锯齿
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, bx, by, bsize, bsize);
    ctx.restore();
  } else {
    ctx.fillStyle = flash ? '#fff' : '#7a3a1e';
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }
  if (flash) {
    const sil = Assets.white('boss');
    if (sil) {
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      ctx.drawImage(sil, bx, by, bsize, bsize);
      ctx.restore();
    }
  }
  // 核心
  ctx.beginPath();
  ctx.arc(cx, cy, 11, 0, Math.PI * 2);
  ctx.fillStyle = b.coreExposed ? C.PERFECT : '#5ad2e0';
  ctx.fill();
  ctx.strokeStyle = C.WARNING;
  ctx.lineWidth = 2;
  ctx.stroke();

  // 冲撞预警（射线方向）
  if (b.state === 'WARN_CHARGE') {
    const v = b.chargeVec || { x: -1, y: 0 };
    ctx.strokeStyle = 'rgba(255,77,77,' + (0.4 + Math.sin(Date.now() / 80) * 0.2) + ')';
    ctx.setLineDash([14, 10]);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + v.x * 900, cy + v.y * 900);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (b.executionReady && b.executionTimer > 0) {
    const p = Game.player;
    const inRange = p && dist(p.x + p.w / 2, p.y + p.h / 2, cx, cy) < 190;
    const pulse = 0.55 + Math.sin(Date.now() / 120) * 0.25;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,209,102,' + pulse + ')';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(b.w, b.h) * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    drawText(inRange ? '按 F 处决' : '靠近 Boss 按 F', cx, b.y - 26, 22, C.PERFECT, 'center', 'bold');
    ctx.restore();
  }
  ctx.restore();
}

function drawBullets() {
  // 玩家子弹（发光圆点）
  for (const b of Game.pBullets) {
    ctx.save();
    if (b.trail && b.trail.length > 1) {
      ctx.strokeStyle = 'rgba(255,220,150,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(b.trail[0].x, b.trail[0].y);
      for (let i = 1; i < b.trail.length; i++) ctx.lineTo(b.trail[i].x, b.trail[i].y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = b.source === 'ECHO' ? C.PERFECT : '#ffe08a';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
  // 敌弹
  for (const b of Game.eBullets) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = b.kind === 'bomb' ? C.WARNING : C.DANGER;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
  // 轰炸预警圈
  for (const bl of Game.blasts) {
    const prog = 1 - bl.timer / bl.maxTimer;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,77,77,' + (0.45 + prog * 0.45) + ')';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bl.x, bl.y, bl.r * (0.55 + prog * 0.45), 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,77,77,' + (0.08 + prog * 0.18) + ')';
    ctx.beginPath();
    ctx.arc(bl.x, bl.y, bl.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawParticles() {
  for (const pt of Game.particles) {
    const a = Math.max(0, pt.life / pt.maxLife);
    ctx.save();
    ctx.globalAlpha = a;
    if (pt.rail) {
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.angle);
      ctx.fillStyle = C.CYAN_LIGHT;
      ctx.fillRect(0, -pt.size / 2, 120, pt.size);
    } else {
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.restore();
  }
  for (const f of Game.floaters) {
    const a = Math.max(0, f.life / f.maxLife);
    ctx.save();
    ctx.globalAlpha = a;
    drawText(f.text, f.x, f.y, f.size, f.color, 'center', 'bold');
    ctx.restore();
  }
}

function drawEvents() {
  for (const ev of Game.events) {
    const x = ev.x, y = ev.y + Math.sin(ev.bob) * 2;
    const col = ev.type === 'altar' ? C.PERFECT : C.CYAN_LIGHT;
    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    const img = Assets.get(ev.type === 'altar' ? 'hr_pillar' : 'hr_crate2');
    if (img) {
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, x - 24, y - 30, 48, 48);
      ctx.restore();
    }
    const label = ev.type === 'altar' ? '献祭祭坛  -15 HP' : '补给商人  -400 分';
    drawText(label, x, y + 34, 10, col, 'center', 'bold');
    ctx.restore();
  }
}

function drawPickups() {
  for (const pk of Game.pickups) {
    const x = pk.x, y = pk.y + Math.sin(pk.bob) * 3;
    const col = pk.type === 'health' ? '#6dff9f' : (pk.type === 'weapon' ? C.CYAN_LIGHT : C.PERFECT);
    const blink = pk.life < 4 && Math.floor(pk.life * 8) % 2 === 0;
    ctx.save();
    ctx.globalAlpha = blink ? 0.35 : 1;
    ctx.fillStyle = 'rgba(8,16,24,0.88)';
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = col;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (pk.type === 'weapon') {
      const icon = Assets.get('wicon_' + pk.weaponId);
      if (icon) {
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(icon, x - 15, y - 15, 30, 30);
        ctx.restore();
      }
    } else if (pk.type === 'health') {
      ctx.fillStyle = col;
      ctx.fillRect(x - 3, y - 11, 6, 22);
      ctx.fillRect(x - 11, y - 3, 22, 6);
    } else if (pk.type === 'chest') {
      const icon = Assets.get('hr_crate2');
      if (icon) {
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(icon, x - 15, y - 15, 30, 30);
        ctx.restore();
      }
    } else {
      // 核弹/清场：辐射三叶
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        const a = i * Math.PI * 2 / 3 - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5);
        ctx.arc(x, y, 13, a - 0.32, a + 0.32);
        ctx.closePath();
        ctx.fill();
      }
    }
    const label = pk.type === 'health' ? '+5 HP'
      : pk.type === 'weapon' ? CONFIG.weapons[pk.weaponId].name
      : (pk.type === 'chest' ? '精英宝箱' : '全图清场');
    drawText(label, x, y + 30, 10, col, 'center', 'bold');
    ctx.restore();
  }
}

