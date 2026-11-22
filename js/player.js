// player.js — 余热突围拆分模块
// ===== 玩家 =====
function createPlayer() {
  return {
    x: FIELD.right / 2 - CONFIG.player.w / 2,
    y: FIELD.bottom / 2 - CONFIG.player.h / 2,
    w: CONFIG.player.w,
    h: CONFIG.player.h,
    drawScale: 1.25,
    dir4: 0,
    dashVec: { x: 1, y: 0 },
    vx: 0,
    vy: 0,
    onGround: true,
    facing: 1,
    hp: CONFIG.player.maxHp,
    invuln: 0,
    dashTimer: 0,
    dashCooldown: 0,
    dashDir: 1,
    dashHitSet: new Set(),
    jumpsUsed: 0,
    heat: 0,
    heatDecayDelay: 0,
    ventStop: 0,
    overheated: 0,
    overheatCounted: false,
    fireTimer: 0,
    muzzleFlash: 0,
    echoWindow: 0,
    echoShotsLeft: 0,
    walkPhase: 0,
    lastAimAngle: 0,
    energy: 0,
    ultTimer: 0,
    ultType: '',
    dead: false
  };
}

// ===== 玩家移动与物理（俯视） =====
const OB = 48; // 16px 素材的整数 3 倍，掩体碰撞盒与绘制尺寸一致

function currentObstacles() {
  return Game.obstacles || [];
}

function resolveObstacle(ent, ob) {
  if (!aabb(ent, ob)) return;
  // 按最小穿透轴推出
  const dx1 = (ob.x + ob.w) - ent.x;      // 从左撞入
  const dx2 = (ent.x + ent.w) - ob.x;     // 从右撞入
  const dy1 = (ob.y + ob.h) - ent.y;      // 从上撞入
  const dy2 = (ent.y + ent.h) - ob.y;     // 从下撞入
  const mx = Math.min(dx1, dx2);
  const my = Math.min(dy1, dy2);
  if (mx < my) {
    ent.x += (dx1 < dx2 ? dx1 : -dx2);
  } else {
    ent.y += (dy1 < dy2 ? dy1 : -dy2);
  }
}

function moveWithPhysics(ent, dt, isPlayer) {
  ent.x += ent.vx * dt;
  ent.y += ent.vy * dt;
  for (const ob of currentObstacles()) resolveObstacle(ent, ob);
  ent.x = clamp(ent.x, FIELD.left, FIELD.right - ent.w);
  ent.y = clamp(ent.y, FIELD.top, FIELD.bottom - ent.h);
  ent.onGround = true;
}

// 掩体是否挡住某点（子弹用）
function pointHitsObstacle(x, y) {
  for (const ob of currentObstacles()) {
    if (x >= ob.x && x <= ob.x + ob.w && y >= ob.y && y <= ob.y + ob.h) return true;
  }
  return false;
}

// 屏幕鼠标坐标 -> 世界坐标（考虑相机）
function mouseWorldPosition() {
  return {
    x: Game.cam.x + (Input.mouse.x - VIEW.left) / CAMERA_ZOOM,
    y: Game.cam.y + (Input.mouse.y - VIEW.top) / CAMERA_ZOOM
  };
}

function aimAngleFromPlayer(p) {
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2 - 5;
  const m = mouseWorldPosition();
  let dx = m.x - cx, dy = m.y - cy;
  // 鼠标压在角色身上时自动瞄准最近敌人，避免方向抖动
  if (Math.hypot(dx, dy) < 14) {
    let best = null, bestD = 720;
    for (const e of Game.enemies) {
      if (!e.alive) continue;
      const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
      const d = dist(cx, cy, ex, ey);
      if (d < bestD) { bestD = d; best = e; }
    }
    if (!best) return p.lastAimAngle || 0;
    dx = best.x + best.w / 2 - cx;
    dy = best.y + best.h / 2 - cy;
  }
  const a = Math.atan2(dy, dx);
  p.lastAimAngle = a;
  return a;
}

function muzzlePosition(p, angle) {
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2 - 6;
  return { x: cx + Math.cos(angle) * 22, y: cy + Math.sin(angle) * 22 };
}

// ===== 玩家更新 =====
function updatePlayer(dt) {
  const p = Game.player;
  if (!p || p.dead) return;
  p.invuln = Math.max(0, p.invuln - dt);
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  p.ventStop = Math.max(0, p.ventStop - dt);
  p.fireTimer = Math.max(0, p.fireTimer - dt);
  p.muzzleFlash = Math.max(0, p.muzzleFlash - dt);
  p.echoWindow = Math.max(0, p.echoWindow - dt);
  p.invulnDash = Math.max(0, (p.invulnDash || 0) - dt);
  p.ultTimer = Math.max(0, p.ultTimer - dt);
  if (Input.consumePress('q') && p.energy >= 100 && p.ultTimer <= 0 && p.overheated <= 0) {
    activateUltimate();
  }

  if (p.overheated > 0) {
    p.overheated -= dt;
    if (p.overheated <= 0) {
      p.overheated = 0;
      p.heat = CONFIG.heat.overheatEndHeat;
      p.overheatCounted = false;
    }
  }

  // --- 冲刺（俯视向量） ---
  if (p.dashTimer > 0) {
    p.dashTimer -= dt;
    p.vx = p.dashVec.x * 900;
    p.vy = p.dashVec.y * 900;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    for (const ob of currentObstacles()) resolveObstacle(p, ob);
    p.x = clamp(p.x, FIELD.left, FIELD.right - p.w);
    p.y = clamp(p.y, FIELD.top, FIELD.bottom - p.h);
    if (Game.upgrades.dash_hit) {
      for (const e of Game.enemies) {
        if (e.alive && !e.spawnProtect && !p.dashHitSet.has(e)) {
          if (aabb(p, e)) {
            p.dashHitSet.add(e);
            damageEnemy(e, 35, 'DASH', { x: p.dashVec.x, y: p.dashVec.y }, { ignoreShield: true });
          }
        }
      }
    }
    if (p.dashTimer <= 0) {
      p.dashCooldown = CONFIG.player.dashCooldown * Math.pow(0.8, Game.upgrades.dash_cd || 0);
      if (Game.upgrades.dash_echo) p.echoWindow = 2.0;
      if (Input.consumePress('r')) attemptVent();
    }
    // 冲刺不中断射击，也不取消热量积累
    if (Input.mouse.down && p.fireTimer <= 0 && p.ventStop <= 0 && p.overheated <= 0) fireWeapon();
    if (p.fireTimer <= 0 && p.ventStop <= 0 && p.overheated <= 0) {
      p.heatDecayDelay += dt;
      if (p.heatDecayDelay >= CONFIG.heat.decayDelay) {
        p.heat = Math.max(0, p.heat - CONFIG.heat.decayRate * dt);
      }
    }
    return;
  }

  // --- 移动：WASD；朝向始终跟随鼠标 ---
  let mx = 0, my = 0;
  if (Input.isDown('a')) mx -= 1;
  if (Input.isDown('d')) mx += 1;
  if (Input.isDown('w')) my -= 1;
  if (Input.isDown('s')) my += 1;
  const len = Math.hypot(mx, my) || 1;
  const speed = CONFIG.player.moveSpeed * (1 + 0.12 * (Game.upgrades.swift_boots || 0));
  p.vx = (mx / len) * speed;
  p.vy = (my / len) * speed;
  if (mx !== 0 || my !== 0) p.walkPhase += dt * 10;
  // 朝向由鼠标世界坐标决定，和移动方向解耦
  const aimA = aimAngleFromPlayer(p);
  p.dir4 = dir4FromVector(Math.cos(aimA), Math.sin(aimA));

  // --- 冲刺触发：朝移动方向，无输入则朝瞄准方向 ---
  if (Input.consumePress('Shift') && p.dashCooldown <= 0 && p.dashTimer <= 0) {
    p.dashTimer = CONFIG.player.dashDuration;
    p.dashCooldown = CONFIG.player.dashCooldown;
    let dx = mx, dy = my;
    if (dx === 0 && dy === 0) {
      const a = aimAngleFromPlayer(p);
      dx = Math.cos(a); dy = Math.sin(a);
    }
    const dl = Math.hypot(dx, dy) || 1;
    p.dashVec = { x: dx / dl, y: dy / dl };
    p.dashHitSet = new Set();
    p.invulnDash = CONFIG.player.dashImmunity;
    Sfx.play('dash');
    burst(p.x + p.w / 2, p.y + p.h / 2, C.CYAN, 10, 160, 3);
  }

  moveWithPhysics(p, dt, true);

  // --- 射击（同帧 R 与射击：先结算泄压） ---
  if (Input.consumePress('r')) attemptVent();
  if (Input.mouse.down && p.fireTimer <= 0 && p.ventStop <= 0 && p.overheated <= 0) {
    fireWeapon();
  }

  // --- 热量自然冷却 ---
  if (p.fireTimer <= 0 && p.ventStop <= 0 && p.overheated <= 0) {
    p.heatDecayDelay += dt;
    if (p.heatDecayDelay >= CONFIG.heat.decayDelay) {
      p.heat = Math.max(0, p.heat - CONFIG.heat.decayRate * dt);
    }
  }
}

function attemptVent() {
  const p = Game.player;
  if (!p || p.overheated > 0 || p.dead) return;
  const h = CONFIG.heat;
  if (p.heat < 20) {
    Game.ui.hintTimer = 1.2;
    Game.ui.hintText = '热量不足';
    return;
  }
  const valveOn = !!(Game.upgrades.valve);
  const pMin = valveOn ? h.valvePerfectMin : h.perfectMin;
  const pMax = valveOn ? h.valvePerfectMax : h.perfectMax;
  const perfect = p.heat >= pMin && p.heat <= pMax;
  p.heat = 0;
  p.ventStop = h.ventStopTime;
  p.heatDecayDelay = 0;
  Sfx.play(perfect ? 'perfect' : 'vent');
  addShake(perfect ? 8 : 3);

  if (perfect) {
    Game.perfectVents += 1;
    Game.score += 25;
    Game.slowMo = Math.max(Game.slowMo, 0.42);
    addShake(10);
    Game.player.dashCooldown = 0;
    p.dashTimer = 0;
    const layers = Game.upgrades.vent_burst || 0;
    const radius = h.perfectRadius + 25 * layers;
    const dmg = h.perfectDamage + 20 * layers;
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      addParticle(cx, cy, Math.cos(a) * 420, Math.sin(a) * 420, C.PERFECT, 0.5, 4);
    }
    for (const e of Game.enemies) {
      if (!e.alive) continue;
      const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
      if (dist(cx, cy, ex, ey) <= radius + e.w / 2) {
        damageEnemy(e, dmg, 'VENT', null, { ignoreShield: true });
        if (Game.upgrades.burn) applyBurn(e, 3);
      }
    }
    for (const b of Game.eBullets) {
      if (dist(cx, cy, b.x, b.y) <= radius) b.life = 0;
    }
    addFloater(cx, cy - 40, '完美泄压', C.PERFECT, 24);
  } else {
    addFloater(p.x + p.w / 2, p.y - 10, '泄压', C.TEXT_MUTED, 16);
  }
}

// ===== 武器大招 / 进化 =====
function isWeaponEvolved(id) {
  if (id === 'pulse') return (Game.upgrades.rapid || 0) >= 2;
  if (id === 'swarm') return (Game.upgrades.bounce || 0) >= 1;
  if (id === 'rail') return (Game.upgrades.pierce || 0) >= 1;
  return false;
}

function activateUltimate() {
  const p = Game.player;
  if (!p) return;
  const type = Game.weaponId;
  p.energy = 0;
  p.ultTimer = 1.1;
  p.ultType = type;
  p.fireTimer = 0;
  Game.hitStop = Math.max(Game.hitStop, 0.07);
  addShake(10);
  Game.flash = Math.max(Game.flash, 0.16);
  Sfx.play('perfect');
  const a = aimAngleFromPlayer(p);
  const muzzle = muzzlePosition(p, a);
  if (type === 'swarm') {
    for (let i = 0; i < 36; i++) {
      const ang = (i / 36) * Math.PI * 2;
      addPlayerBullet({
        x: muzzle.x, y: muzzle.y,
        vx: Math.cos(ang) * 900, vy: Math.sin(ang) * 900,
        damage: 14, r: 3, maxRange: 520, source: 'BULLET'
      });
    }
    addFloater(p.x + p.w / 2, p.y - 22, '蜂群风暴', C.CYAN_LIGHT, 26);
    burst(p.x + p.w / 2, p.y + p.h / 2, C.CYAN_LIGHT, 30, 260, 4);
  } else if (type === 'rail') {
    const shot = { hit: false };
    for (let k = -2; k <= 2; k++) {
      fireRail(muzzle, a + k * 0.13, p.heat, shot, 1.6);
    }
    addFloater(p.x + p.w / 2, p.y - 22, '磁轨过载', C.CYAN_LIGHT, 26);
    addShake(8);
  } else {
    addFloater(p.x + p.w / 2, p.y - 22, '脉冲超载', C.PERFECT, 26);
  }
}

// ===== 武器开火 =====
function fireWeapon() {
  const p = Game.player;
  const w = CONFIG.weapons[Game.weaponId];
  const angle = aimAngleFromPlayer(p);
  const preFireHeat = p.heat;
  const shotRef = { hit: false };

  const evolved = isWeaponEvolved(w.id);
  const ultPulse = p.ultTimer > 0 && p.ultType === 'pulse';
  const rate = w.fireRate * (1 + 0.12 * (Game.upgrades.rapid || 0)) *
    (evolved && w.id === 'pulse' ? 1.2 : 1) * (ultPulse ? 3 : 1);
  p.fireTimer = 1 / rate;
  Game.shotsFired += 1;
  p.muzzleFlash = 0.08;
  p.heatDecayDelay = 0;

  const heatAdd = ultPulse ? 0 : w.heat * (Game.upgrades.stable_grip ? 0.8 : 1);
  p.heat = Math.min(CONFIG.heat.max, p.heat + heatAdd);
  if (p.heat >= CONFIG.heat.max && p.overheated <= 0) {
    triggerOverheat();
  }

  const muzzle = muzzlePosition(p, angle);
  const echoActive = Game.upgrades.dash_echo && p.echoWindow > 0;
  const echoDamageBase = echoActive ? computeBulletDamage(preFireHeat).damage * 0.45 : 0;
  if (echoActive) p.echoWindow = 0;

  if (w.type === 'instant') {
    fireRail(muzzle, angle, preFireHeat, shotRef);
    Sfx.play('rail');
  } else if (w.id === 'swarm') {
    const pellets = w.pellets + (evolved ? 4 : 0);
    for (let i = 0; i < pellets; i++) {
      const spread = (i / (pellets - 1) - 0.5) * w.spread;
      const a = angle + spread + (rnd() - 0.5) * 0.02;
      const calc = computeBulletDamage(preFireHeat);
      addPlayerBullet({
        x: muzzle.x, y: muzzle.y,
        vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed,
        damage: calc.damage, crit: calc.crit,
        maxRange: w.range, r: 3,
        pierceLeft: Game.upgrades.pierce || 0,
        bounceLeft: Game.upgrades.bounce || 0,
        shot: shotRef
      });
    }
    Sfx.play('shoot');
  } else {
    const calc = computeBulletDamage(preFireHeat);
    const dmgMul = (evolved ? 1.1 : 1) * (ultPulse ? 1.25 : 1);
    addPlayerBullet({
      x: muzzle.x, y: muzzle.y,
      vx: Math.cos(angle) * w.speed, vy: Math.sin(angle) * w.speed,
      damage: calc.damage * dmgMul, crit: calc.crit,
      r: 4,
      pierceLeft: (Game.upgrades.pierce || 0) + (ultPulse ? 2 : 0),
      bounceLeft: Game.upgrades.bounce || 0,
      shot: shotRef
    });
    Sfx.play('shoot');
  }

  if (echoActive) {
    for (const s of [-0.12, 0.12]) {
      addPlayerBullet({
        x: muzzle.x, y: muzzle.y,
        vx: Math.cos(angle + s) * 1050, vy: Math.sin(angle + s) * 1050,
        damage: echoDamageBase, r: 3, source: 'ECHO', maxRange: 1200, shot: shotRef
      });
    }
  }
}

function fireRail(muzzle, angle, preFireHeat, shotRef, damageMul) {
  const p = Game.player;
  const w = CONFIG.weapons.rail;
  const evolved = isWeaponEvolved('rail');
  const pierceCount = w.pierce + (Game.upgrades.pierce ? 1 : 0) + (evolved ? 2 : 0);
  const calc = computeBulletDamage(preFireHeat);
  const dirX = Math.cos(angle), dirY = Math.sin(angle);
  const targets = [];
  for (const e of Game.enemies) {
    if (!e.alive) continue;
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    const dx = cx - muzzle.x, dy = cy - muzzle.y;
    const along = dx * dirX + dy * dirY;
    if (along <= 0) continue;
    const perp = Math.abs(dx * dirY - dy * dirX);
    if (perp <= Math.max(e.w, e.h) * 0.55 && along <= w.range) {
      targets.push({ e, d: along });
    }
  }
  targets.sort((a, b) => a.d - b.d);
  let firstHit = null;
  for (let i = 0; i < Math.min(pierceCount, targets.length); i++) {
    const t = targets[i];
    const mul = i === 0 ? 1 : 0.7;
    damageEnemy(t.e, calc.damage * mul * (evolved ? 1.15 : 1) * (damageMul || 1),
      'BULLET', { x: dirX, y: dirY }, { crit: calc.crit && i === 0 });
    if (!firstHit) firstHit = t;
  }
  if (firstHit) markShotHit(shotRef);
  // 射线视觉
  Game.particles.push({
    x: muzzle.x, y: muzzle.y,
    vx: dirX * 2200, vy: dirY * 2200,
    color: C.CYAN_LIGHT, life: 0.18, maxLife: 0.18, size: 6, drag: 1,
    rail: true, angle
  });
  addShake(3);
}

function triggerOverheat() {
  const p = Game.player;
  p.overheated = CONFIG.heat.overheatLock;
  p.heat = CONFIG.heat.max;
  if (!p.overheatCounted) {
    Game.overheatCount += 1;
    p.overheatCounted = true;
  }
  Sfx.play('overheat');
  addShake(6);
  addFloater(p.x + p.w / 2, p.y - 20, '过热', C.DANGER, 20);
}

