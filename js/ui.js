// ui.js — 余热突围拆分模块
// ===== 通用 UI =====
Game.uiRects = [];
function registerRect(name, x, y, w, h, data) {
  Game.uiRects.push({ name, x, y, w, h, data });
}
function mouseIn(r) {
  return Input.mouse.x >= r.x && Input.mouse.x <= r.x + r.w &&
         Input.mouse.y >= r.y && Input.mouse.y <= r.y + r.h;
}
function drawWrapped(text, x, y, maxW, lineH, size, color, weight) {
  ctx.save();
  ctx.font = (weight || 'normal') + ' ' + size + 'px "Microsoft YaHei","PingFang SC",sans-serif';
  ctx.fillStyle = color || C.TEXT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  let line = '';
  let yy = y;
  for (const ch of text) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = ch;
      yy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
  ctx.restore();
}
function drawButton(name, label, x, y, w, h, opts) {
  const o = opts || {};
  const disabled = !!o.disabled;
  const selected = !!o.selected && !disabled;
  const hover = mouseIn({ x, y, w, h }) && !disabled;
  const fill = disabled ? 'rgba(20,26,32,0.85)'
    : selected ? 'rgba(255,209,102,0.10)'
    : hover ? 'rgba(57,217,230,0.18)' : 'rgba(17,28,38,0.9)';
  const stroke = disabled ? C.TEXT_MUTED
    : selected ? C.PERFECT
    : hover ? C.CYAN_LIGHT : C.CYAN;
  drawPanel(x, y, w, h, { fill, stroke, cut: 8, glow: hover ? 10 : (selected ? 8 : 0), lineWidth: 2 });
  const labelSize = o.size || 20;
  const labelY = y + h / 2 - (o.sub ? 7 : 0);
  drawText(label, x + w / 2, labelY, o.sub ? labelSize - 1 : labelSize,
    disabled ? C.TEXT_MUTED : (selected ? C.PERFECT : (hover ? C.CYAN_LIGHT : C.TEXT)), 'center', 'bold');
  if (o.sub) drawText(o.sub, x + w / 2, y + h - 11, 11, C.TEXT_MUTED, 'center');
  registerRect(name, x, y, w, h, o.data);
  return hover;
}

// ===== HUD =====
function drawHUD() {
  const p = Game.player;
  if (!p) return;
  // HP
  drawPanel(24, 20, 360, 48, { cut: 10 });
  ctx.save();
  ctx.strokeStyle = C.CYAN;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(44, 34); ctx.lineTo(44, 54);
  ctx.moveTo(34, 44); ctx.lineTo(54, 44);
  ctx.stroke();
  ctx.restore();
  const hpRatio = clamp(p.hp / CONFIG.player.maxHp, 0, 1);
  ctx.fillStyle = 'rgba(8,16,24,0.7)';
  ctx.fillRect(64, 34, 284, 20);
  ctx.fillStyle = hpRatio > 0.35 ? C.CYAN : C.DANGER;
  ctx.fillRect(64, 34, 284 * hpRatio, 20);
  ctx.strokeStyle = 'rgba(57,217,230,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(64, 34, 284, 20);
  drawMono(Math.ceil(p.hp) + ' / ' + CONFIG.player.maxHp, 352, 44, 14, C.TEXT, 'right');

  // 击杀播报（只在战斗状态显示）
  if (Game.state === 'PLAYING') {
    for (let i = 0; i < Game.killFeed.length; i++) {
      const f = Game.killFeed[i];
      ctx.save();
      ctx.globalAlpha = Math.min(1, f.life / 0.6);
      drawText(f.text, 34, 82 + i * 15, 11, f.color, 'left');
      ctx.restore();
    }
  }

  // 分数与连击
  drawPanel(920, 20, 336, 96, { cut: 12 });
  drawText('分数', 944, 40, 14, C.TEXT_MUTED);
  drawMono(Game.score.toString(), 1240, 46, 26, C.TEXT, 'right');
  const mul = comboMultiplier();
  drawText('连击', 944, 72, 14, C.TEXT_MUTED);
  drawMono(Game.combo + '  ×' + mul.toFixed(1), 944, 96, 18, Game.comboTimer > 0 && Game.comboTimer < 1 ? C.WARNING : C.CYAN_LIGHT);
  drawText('最高 ' + Game.maxCombo, 1240, 96, 13, C.TEXT_MUTED, 'right');

  // 热量
  drawPanel(360, 648, 560, 64, { cut: 12 });
  const hx = 380, hy = 666, hw = 520, hh = 28;
  ctx.fillStyle = 'rgba(8,16,24,0.7)';
  ctx.fillRect(hx, hy, hw, hh);
  const heatRatio = clamp(p.heat / CONFIG.heat.max, 0, 1);
  let heatColor = C.CYAN;
  if (p.overheated > 0) heatColor = Math.floor(Date.now() / 100) % 2 ? C.DANGER : '#ffffff';
  else if (Game.upgrades.valve && heatRatio >= 0.5) heatColor = C.PERFECT;
  else if (heatRatio >= 0.6) heatColor = C.HEAT;
  if (p.overheated <= 0) {
    ctx.fillStyle = heatColor;
    ctx.fillRect(hx, hy, hw * heatRatio, hh);
  }
  const valveOn = !!Game.upgrades.valve;
  const pMin = valveOn ? 50 : 60, pMax = valveOn ? 90 : 85;
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = C.PERFECT;
  ctx.fillRect(hx + hw * (pMin / 100), hy, hw * ((pMax - pMin) / 100), hh);
  ctx.restore();
  ctx.strokeStyle = C.HEAT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hx + hw * 0.6, hy - 4);
  ctx.lineTo(hx + hw * 0.6, hy + hh + 4);
  ctx.stroke();
  drawText('热量', 380, 638, 12, C.TEXT_MUTED);
  if (p.overheated > 0) drawText('过热', 900, 680, 14, C.DANGER, 'right', 'bold');
  else if (p.ventStop > 0) drawText('泄压中', 900, 680, 14, C.TEXT_MUTED, 'right');

  // 武器
  drawPanel(24, 620, 220, 80, { cut: 10 });
  const icon = Assets.get('wicon_' + Game.weaponId);
  if (icon) {
    ctx.drawImage(icon, 34, 630, 60, 60);
  } else {
    ctx.strokeStyle = C.CYAN;
    ctx.strokeRect(38, 634, 52, 52);
  }
  drawText(CONFIG.weapons[Game.weaponId].name, 104, 646, 15, C.TEXT, 'left', 'bold');
  if (isWeaponEvolved(Game.weaponId)) {
    drawText('进化', 224, 646, 11, C.PERFECT, 'right', 'bold');
  }
  drawText('射速 ' + (CONFIG.weapons[Game.weaponId].fireRate * (1 + 0.12 * (Game.upgrades.rapid || 0))).toFixed(1) + '/s',
    104, 666, 11, C.TEXT_MUTED);
  const energy = p.energy || 0;
  drawText('Q 大招', 104, 682, 10, energy >= 100 ? C.PERFECT : C.TEXT_MUTED);
  ctx.fillStyle = 'rgba(8,16,24,0.7)';
  ctx.fillRect(150, 679, 78, 6);
  ctx.fillStyle = energy >= 100 ? C.PERFECT : C.CYAN;
  ctx.fillRect(150, 679, 78 * clamp(energy / 100, 0, 1), 6);

  // Boss 血条
  if (Game.boss && Game.boss.alive) {
    // 宽度收到 620，右端止于 880，避开右上角分数面板
    drawPanel(260, 84, 620, 52, { cut: 10, stroke: C.HEAT });
    const br = clamp(Game.boss.hp / Game.boss.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(8,16,24,0.75)';
    ctx.fillRect(276, 100, 588, 20);
    ctx.fillStyle = C.HEAT;
    ctx.fillRect(276, 100, 588 * br, 20);
    ctx.strokeStyle = C.DANGER;
    ctx.lineWidth = 1.5;
    for (const mark of [0.70, 0.35]) {
      ctx.beginPath();
      ctx.moveTo(276 + 588 * mark, 96);
      ctx.lineTo(276 + 588 * mark, 124);
      ctx.stroke();
    }
    drawText('熔炉执法者', 276, 92, 12, C.HEAT, 'left', 'bold');
    // 数值底衬，避免满血时压在橙金色填充上看不清
    ctx.fillStyle = 'rgba(8,16,24,0.72)';
    ctx.fillRect(762, 102, 102, 17);
    drawMono(Math.ceil(Game.boss.hp) + ' / ' + Math.ceil(Game.boss.maxHp), 858, 110, 12, C.TEXT, 'right');
    // 装甲条
    const b = Game.boss;
    if (b.armor > 0) {
      const ar = clamp(b.armor / b.armorMax, 0, 1);
      ctx.fillStyle = 'rgba(8,16,24,0.75)';
      ctx.fillRect(276, 126, 588, 6);
      ctx.fillStyle = C.CYAN_LIGHT;
      ctx.fillRect(276, 126, 588 * ar, 6);
      ctx.strokeStyle = 'rgba(140,245,255,0.55)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(276 + 588 * i / 3, 124);
        ctx.lineTo(276 + 588 * i / 3, 133);
        ctx.stroke();
      }
    } else if (b.armorBroken) {
      drawText('装甲已破 · 核心暴露', 276, 130, 10, C.CYAN_LIGHT, 'left', 'bold');
    }
  }

  // 冲刺冷却：固定在左上 HUD，不再贴近鼠标
  drawPanel(400, 20, 180, 48, { cut: 10 });
  drawText('冲刺', 416, 44, 13, C.TEXT_MUTED);
  const dashRatio = p.dashCooldown > 0 ? 1 - p.dashCooldown / (CONFIG.player.dashCooldown * Math.pow(0.8, Game.upgrades.dash_cd || 0)) : 1;
  ctx.fillStyle = 'rgba(8,16,24,0.7)';
  ctx.fillRect(456, 36, 108, 16);
  ctx.fillStyle = dashRatio >= 1 ? C.CYAN : C.TEXT_MUTED;
  ctx.fillRect(456, 36, 108 * clamp(dashRatio, 0, 1), 16);
  ctx.strokeStyle = 'rgba(57,217,230,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(456, 36, 108, 16);

  if (Game.horde) {
    drawPanel(600, 20, 200, 48, { cut: 10, stroke: C.DANGER });
    drawText('怪物潮', 616, 44, 14, C.DANGER, 'left', 'bold');
    drawMono(Math.max(0, Math.ceil(Game.horde.timer)) + 's', 784, 44, 15, C.PERFECT, 'right');
  }

  if (Game.ui.hintTimer > 0 && Game.ui.hintText) {
    drawPanel(440, 590, 400, 40, { cut: 8, stroke: C.WARNING });
    drawText(Game.ui.hintText, 640, 610, 16, C.WARNING, 'center');
  }

  if (Game.ui.banner && Game.ui.banner.timer > 0) {
    const alpha = Math.min(1, Game.ui.banner.timer / 0.4);
    ctx.save();
    ctx.globalAlpha = alpha;
    drawText(Game.ui.banner.text, 640, 250, 42, C.HEAT, 'center', 'bold');
    if (Game.ui.banner.sub) drawText(Game.ui.banner.sub, 640, 292, 18, C.DANGER, 'center');
    ctx.restore();
  }
}

function drawScreenEffects() {
  const p = Game.player;
  const pulse = 0.5 + Math.sin(Date.now() / 160) * 0.18;
  let danger = 0;
  if (p && !p.dead) {
    const r = p.hp / CONFIG.player.maxHp;
    if (r < 0.35) danger = Math.max(danger, (0.35 - r) / 0.35 * 0.55);
  }
  if (Game.horde && Game.horde.timer > 0) danger = Math.max(danger, 0.55);
  if (Game.bossIntroTimer > 0) danger = Math.max(danger, 0.38);
  if (Game.slowMo > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.22, Game.slowMo * 0.5);
    ctx.fillStyle = '#3fa8ff';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = Math.min(0.75, Game.slowMo * 1.6);
    ctx.strokeStyle = C.CYAN_LIGHT;
    ctx.lineWidth = 3;
    ctx.strokeRect(VIEW.left, VIEW.top, VIEW.w, VIEW.h);
    ctx.restore();
  }
  if (danger > 0) {
    ctx.save();
    ctx.globalAlpha = clamp(danger * pulse, 0, 0.7);
    const edge = 120;
    let g = ctx.createLinearGradient(0, 0, edge, 0);
    g.addColorStop(0, 'rgba(255,42,42,0.9)'); g.addColorStop(1, 'rgba(255,42,42,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, edge, H);
    g = ctx.createLinearGradient(W, 0, W - edge, 0);
    g.addColorStop(0, 'rgba(255,42,42,0.9)'); g.addColorStop(1, 'rgba(255,42,42,0)');
    ctx.fillStyle = g; ctx.fillRect(W - edge, 0, edge, H);
    g = ctx.createLinearGradient(0, 0, 0, edge);
    g.addColorStop(0, 'rgba(255,42,42,0.9)'); g.addColorStop(1, 'rgba(255,42,42,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, edge);
    g = ctx.createLinearGradient(0, H, 0, H - edge);
    g.addColorStop(0, 'rgba(255,42,42,0.9)'); g.addColorStop(1, 'rgba(255,42,42,0)');
    ctx.fillStyle = g; ctx.fillRect(0, H - edge, W, edge);
    ctx.restore();
  }
}

function drawBossIntro() {
  const t = Game.bossIntroTimer;
  if (t <= 0) return;
  const total = 2.0;
  const fade = Math.min(1, t / 0.3, (total - t) / 0.3 + 0.2);
  ctx.save();
  ctx.globalAlpha = clamp(fade, 0.25, 1);
  // 上下黑边
  ctx.fillStyle = 'rgba(0,0,0,0.78)';
  ctx.fillRect(0, 0, W, 58);
  ctx.fillRect(0, H - 58, W, 58);
  // 危险条纹
  for (let i = 0; i < 24; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(255,77,77,0.55)' : 'rgba(20,10,14,0.8)';
    ctx.beginPath();
    ctx.moveTo(i * 56, 58);
    ctx.lineTo(i * 56 + 28, 58);
    ctx.lineTo(i * 56 + 8, 68);
    ctx.lineTo(i * 56 - 20, 68);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(i * 56, H - 58);
    ctx.lineTo(i * 56 + 28, H - 58);
    ctx.lineTo(i * 56 + 48, H - 48);
    ctx.lineTo(i * 56, H - 48);
    ctx.closePath();
    ctx.fill();
  }
  ctx.shadowColor = C.HEAT;
  ctx.shadowBlur = 24;
  drawText('熔炉执法者', 640, 250, 54, C.HEAT, 'center', 'bold');
  ctx.shadowBlur = 0;
  drawText('B O S S', 640, 306, 20, C.DANGER, 'center', 'bold');
  drawText('警报：高能目标接近', 640, 350, 16, C.DANGER, 'center');
  ctx.restore();
}

function drawCrosshair() {
  const x = Input.mouse.x, y = Input.mouse.y;
  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.shadowColor = C.CYAN_LIGHT;
  ctx.shadowBlur = 6;
  ctx.strokeStyle = C.CYAN_LIGHT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 18, y); ctx.lineTo(x - 6, y);
  ctx.moveTo(x + 6, y); ctx.lineTo(x + 18, y);
  ctx.moveTo(x, y - 18); ctx.lineTo(x, y - 6);
  ctx.moveTo(x, y + 6); ctx.lineTo(x, y + 18);
  ctx.stroke();
  ctx.fillStyle = C.CYAN_LIGHT;
  ctx.beginPath();
  ctx.arc(x, y, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ===== 标题页 =====
function updateTitle() {
  if (LeaderboardPanel.open) {
    LeaderboardPanel.update();
    return;
  }

  for (let i = 0; i < 3; i++) {
    if (Input.consumePress(String(i + 1))) {
      Game.weaponId = ['pulse', 'swarm', 'rail'][i];
    }
  }

  if (Input.mouse.pressed) {
    for (const r of Game.uiRects) {
      if (!mouseIn(r)) continue;
      if (r.name === 'weapon') { Game.weaponId = r.data; }
      else if (r.name === 'mode') {
        if (r.data === 'hard' && !Storage.data.hardUnlocked) {
          Game.ui.hintTimer = 1.2; Game.ui.hintText = '通关一次解锁困难模式';
        } else {
          Game.mode = r.data;
        }
      }
      else if (r.name === 'leaderboard') { LeaderboardPanel.show(); }
      else if (r.name === 'start') { startRun(); }
      else if (r.name === 'mute') { toggleMute(); }
    }
  }
  if (Input.consumePress('Enter')) startRun();
}

function drawTitle() {
  ctx.save();
  ctx.globalAlpha = 0.9;
  drawText('余热突围', 640, 96, 64, C.CYAN_LIGHT, 'center', 'bold');
  ctx.globalAlpha = 0.6;
  drawText('AFTERHEAT BREAKTHROUGH', 640, 140, 18, C.TEXT_MUTED, 'center');
  ctx.restore();

  drawText('选择武器', 640, 190, 18, C.TEXT, 'center');
  const cards = ['pulse', 'swarm', 'rail'];
  const cardW = 240, cardH = 180, gap = 30;
  const startX = (W - (cardW * 3 + gap * 2)) / 2;
  for (let i = 0; i < cards.length; i++) {
    const id = cards[i];
    const x = startX + i * (cardW + gap), y = 215;
    const selected = Game.weaponId === id;
    const hover = mouseIn({ x, y, w: cardW, h: cardH });
    drawPanel(x, y, cardW, cardH, { cut: 12, stroke: selected ? C.PERFECT : (hover ? C.CYAN_LIGHT : C.CYAN), glow: selected ? 14 : (hover ? 8 : 0), fill: selected ? 'rgba(57,217,230,0.12)' : 'rgba(17,28,38,0.9)' });
    const icon = Assets.get('wicon_' + id);
    if (icon) ctx.drawImage(icon, x + 56, y + 8, 128, 128);
    else { ctx.strokeStyle = C.CYAN; ctx.strokeRect(x + 56, y + 8, 128, 128); }
    drawText(CONFIG.weapons[id].name, x + cardW / 2, y + 134, 18, C.TEXT, 'center', 'bold');
    drawText('伤害 ' + CONFIG.weapons[id].damage + '  ·  热量 ' + CONFIG.weapons[id].heat, x + cardW / 2, y + 160, 12, C.TEXT_MUTED, 'center');
    drawText(String(i + 1), x + 16, y + 16, 14, C.TEXT_MUTED);
    registerRect('weapon', x, y, cardW, cardH, id);
  }

  drawText('模式', 640, 430, 16, C.TEXT_MUTED, 'center');
  const modeW = 180, modeH = 46;
  const hardLocked = !Storage.data.hardUnlocked;
  drawButton('mode', '普通', 640 - modeW - 12, 448, modeW, modeH,
    { data: 'normal', size: 17, selected: Game.mode === 'normal' });
  drawButton('mode', '困难', 640 + 12, 448, modeW, modeH,
    { data: 'hard', size: 17, selected: Game.mode === 'hard', disabled: hardLocked, sub: hardLocked ? '通关后解锁' : '' });

  drawText('游戏名称', 640, 514, 16, C.TEXT_MUTED, 'center');
  if (typeof ProfileInput !== 'undefined') ProfileInput.syncLayout();
  drawButton('leaderboard', '排行榜', 778, 536, 112, 42, { size: 15 });

  drawButton('start', '开始游戏', 640 - 150, 602, 300, 58, { size: 24 });

  const d = Storage.data;
  drawText('普通模式最高分 ' + (d.normalBest || 0) + '   最快 ' + (d.normalFastest ? fmtTime(d.normalFastest) : '—'),
    640, 688, 13, C.TEXT_MUTED, 'center');
  drawText('WASD 移动   鼠标瞄准/朝向   左键射击   Q 大招   Shift 冲刺   R 泄压   Esc 暂停   M 静音', 640, 712, 11, C.TEXT_MUTED, 'center');
  drawButton('mute', Sfx.muted ? '静音：开' : '静音：关', 1120, 640, 130, 40, { size: 13 });

  if (Game.ui.hintTimer > 0 && Game.ui.hintText) {
    drawPanel(440, 570, 400, 40, { cut: 8, stroke: C.WARNING });
    drawText(Game.ui.hintText, 640, 590, 16, C.WARNING, 'center');
  }
}

// ===== 升级页 =====
function updateUpgrade() {
  if (Input.mouse.pressed) {
    for (const r of Game.uiRects) {
      if (mouseIn(r) && r.name === 'upgrade') selectUpgrade(r.data);
    }
  }
  for (let i = 0; i < Game.upgradeChoices.length; i++) {
    if (Input.consumePress(String(i + 1))) selectUpgrade(i);
  }
}
function selectUpgrade(index) {
  const id = Game.upgradeChoices[index];
  if (!id) return;
  applyUpgrade(id);
}
function drawUpgrade() {
  ctx.fillStyle = 'rgba(4,8,12,0.72)';
  ctx.fillRect(0, 0, W, H);
  drawText('选择一项升级', 640, 116, 30, C.CYAN_LIGHT, 'center', 'bold');
  drawText('战斗已暂停', 640, 150, 14, C.TEXT_MUTED, 'center');
  const cardW = 280, cardH = 380, gap = 32;
  const startX = (W - (cardW * 3 + gap * 2)) / 2;
  const routeNames = { vent: '泄压', dash: '冲刺', mobility: '机动', gun: '枪械' };
  for (let i = 0; i < 3; i++) {
    const id = Game.upgradeChoices[i];
    const x = startX + i * (cardW + gap), y = 180;
    if (!id) {
      drawPanel(x, y, cardW, cardH, { cut: 12, stroke: C.TEXT_MUTED, fill: 'rgba(12,18,24,0.5)' });
      continue;
    }
    const def = UPGRADE_DEFS[id];
    const hover = mouseIn({ x, y, w: cardW, h: cardH });
    drawPanel(x, y, cardW, cardH, {
      cut: 14,
      stroke: hover ? C.PERFECT : C.CYAN,
      glow: hover ? 16 : 0,
      fill: hover ? 'rgba(30,52,66,0.98)' : 'rgba(17,28,38,0.95)'
    });
    const icon = Assets.get('upg_' + id);
    const ix = x + (cardW - 150) / 2, iy = y + 46;
    if (icon) {
      ctx.drawImage(icon, ix, iy, 150, 150);
    } else {
      // 素材缺失时的程序化图标兜底，避免出现空框
      drawPanel(ix, iy, 150, 150, { cut: 18, fill: 'rgba(57,217,230,0.06)', stroke: C.CYAN });
      ctx.save();
      ctx.strokeStyle = C.CYAN_LIGHT;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ix + 75, iy + 75, 34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ix + 75, iy + 48); ctx.lineTo(ix + 101, iy + 75);
      ctx.lineTo(ix + 75, iy + 102); ctx.lineTo(ix + 49, iy + 75);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
    drawText(def.name, x + cardW / 2, y + 222, 24, C.TEXT, 'center', 'bold');
    drawText(routeNames[def.route], x + cardW / 2, y + 252, 13, C.CYAN, 'center');
    drawWrapped(def.desc, x + 28, y + 274, cardW - 56, 20, 14, C.TEXT_MUTED);
    const lv = upgradeLevel(id);
    drawText('当前 ' + lv + ' / ' + def.max, x + cardW / 2, y + 352, 13, lv >= def.max ? C.PERFECT : C.TEXT_MUTED, 'center');
    drawText(String(i + 1), x + 18, y + 18, 14, C.TEXT_MUTED);
    registerRect('upgrade', x, y, cardW, cardH, i);
  }
}

// ===== 暂停/结算 =====
function updatePause() {
  if (Input.mouse.pressed) {
    for (const r of Game.uiRects) {
      if (!mouseIn(r)) continue;
      if (r.name === 'resume') Game.state = Game.prevState || 'PLAYING';
      else if (r.name === 'restart') startRun();
      else if (r.name === 'totitle') gotoTitle();
      else if (r.name === 'mute') toggleMute();
      else if (r.name === 'shake') {
        Storage.data.shake = !Storage.data.shake;
        Storage.save();
      }
    }
  }
  if (Input.consumePress('Escape')) Game.state = Game.prevState || 'PLAYING';
}
function drawPause() {
  ctx.fillStyle = 'rgba(4,8,12,0.75)';
  ctx.fillRect(0, 0, W, H);
  drawPanel(280, 120, 720, 480, { cut: 16 });
  drawText('已暂停', 640, 180, 30, C.CYAN_LIGHT, 'center', 'bold');
  drawButton('resume', '继续', 500, 240, 280, 54, { size: 20 });
  drawButton('restart', '重新开始', 500, 310, 280, 54, { size: 20 });
  drawButton('totitle', '返回标题', 500, 380, 280, 54, { size: 20 });
  drawButton('mute', Sfx.muted ? '静音：开' : '静音：关', 500, 450, 280, 54, { size: 18 });
  drawButton('shake', Storage.data.shake ? '屏幕震动：开' : '屏幕震动：关', 500, 514, 280, 44, { size: 16 });
  drawText('按 Esc 继续', 640, 606, 13, C.TEXT_MUTED, 'center');
}

function updateResult() {
  if (Input.mouse.pressed) {
    for (const r of Game.uiRects) {
      if (!mouseIn(r)) continue;
      if (r.name === 'restart') startRun();
      else if (r.name === 'totitle') gotoTitle();
    }
  }
  if (Input.consumePress('Enter')) startRun();
}
function drawResult() {
  const res = Game.lastResult;
  ctx.fillStyle = 'rgba(4,8,12,0.8)';
  ctx.fillRect(0, 0, W, H);
  drawPanel(280, 60, 720, 600, { cut: 16, stroke: res && res.win ? C.PERFECT : C.DANGER });
  drawText(res && res.win ? '突围成功' : '突围失败', 640, 104, 34, res && res.win ? C.PERFECT : C.DANGER, 'center', 'bold');
  if (!res) return;
  let y = 156;
  const line = (label, value, color) => {
    drawText(label, 330, y, 15, C.TEXT_MUTED);
    drawText(value, 950, y, 15, color || C.TEXT, 'right');
    y += 26;
  };
  line('总分', String(res.score), C.CYAN_LIGHT);
  line('模式', res.mode === 'hard' ? '困难' : '普通');
  line('武器', res.weapon);
  line('用时', fmtTime(res.time));
  line('最高连击', String(res.maxCombo));
  line('命中率', res.accuracy.toFixed(1) + '%');
  line('完美泄压', String(res.perfectVents));
  line('过热次数', String(res.overheatCount));
  if (Game.newRecordFlags.best) drawText('新纪录！', 640, y, 18, C.PERFECT, 'center', 'bold');
  y += 28;
  drawText('本局升级', 330, y, 15, C.TEXT_MUTED);
  y += 24;
  if (res.upgrades.length === 0) {
    drawText('无', 330, y, 14, C.TEXT_MUTED);
    y += 22;
  } else {
    let lineText = '';
    for (const u of res.upgrades) {
      const nm = UPGRADE_DEFS[u.id] ? UPGRADE_DEFS[u.id].name : u.id;
      lineText += nm + (u.level > 1 ? '×' + u.level : '') + '   ';
    }
    drawWrapped(lineText, 330, y, 620, 22, 14, C.TEXT);
    y += 44;
  }
  drawButton('restart', '再来一局', 380, 584, 240, 52, { size: 19 });
  drawButton('totitle', '返回标题', 660, 584, 240, 52, { size: 19 });
}

function toggleMute() {
  Sfx.muted = !Sfx.muted;
  Storage.data.muted = Sfx.muted;
  Storage.save();
}

