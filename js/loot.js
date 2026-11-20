// loot.js — 余热突围拆分模块
// ===== 掉落物 =====
function spawnPickup(pos, type, weaponId) {
  const cfg = CONFIG.pickup;
  Game.pickups.push({
    x: clamp(pos.x, 20, FIELD.right - 20),
    y: clamp(pos.y, 20, FIELD.bottom - 20),
    type, weaponId: weaponId || null,
    life: cfg.life, maxLife: cfg.life,
    bob: rnd() * Math.PI * 2
  });
  Game.dropDry = 0;
}

function rollDrop(e) {
  const cfg = CONFIG.pickup;
  Game.dropDry += 1;
  if (rnd() < cfg.nukeChance) {
    spawnPickup({ x: e.x + e.w / 2, y: e.y + e.h / 2 }, 'nuke');
    return;
  }
  if (rnd() < cfg.weaponChance) {
    const ids = ['pulse', 'swarm', 'rail'].filter((id) => id !== Game.weaponId);
    const weaponId = ids[Math.floor(rnd() * ids.length)];
    spawnPickup({ x: e.x + e.w / 2, y: e.y + e.h / 2 }, 'weapon', weaponId);
    return;
  }
  if (rnd() < cfg.healthChance || Game.dropDry >= cfg.dryLimit) {
    spawnPickup({ x: e.x + e.w / 2, y: e.y + e.h / 2 }, 'health');
  }
}

function triggerNuke() {
  const p = Game.player;
  Game.flash = 0.55;
  addShake(18);
  for (const e of Game.enemies) {
    if (e.alive && !e.isBoss) killEnemy(e, 'NUKE');
  }
  if (Game.boss && Game.boss.alive) damageBoss(700, {});
  Game.eBullets = [];
  Game.blasts = [];
  Game.pendingSpawn = [];
  Sfx.play('vent');
  const cx = p ? p.x + p.w / 2 : FIELD.right / 2;
  const cy = p ? p.y + p.h / 2 : FIELD.bottom / 2;
  for (let i = 0; i < 50; i++) {
    const a = rnd() * Math.PI * 2, sp = rndRange(240, 760);
    addParticle(cx, cy, Math.cos(a) * sp, Math.sin(a) * sp, C.PERFECT, 0.6 + rnd() * 0.4, 5);
  }
  addFloater(cx, cy - 46, '全图清场！', C.PERFECT, 30);
}

function collectPickup(pk) {
  const p = Game.player;
  const cfg = CONFIG.pickup;
  if (!p) return;
  if (pk.type === 'health') {
    p.hp = Math.min(CONFIG.player.maxHp, p.hp + cfg.healthAmount);
    addFloater(p.x + p.w / 2, p.y - 16, '+' + cfg.healthAmount + ' HP', '#6dff9f', 22);
    burst(p.x + p.w / 2, p.y + p.h / 2, '#6dff9f', 14, 180, 3);
    Sfx.play('perfect');
  } else if (pk.type === 'weapon') {
    Game.weaponId = pk.weaponId;
    p.fireTimer = 0.18;
    p.echoWindow = 0;
    p.ultTimer = 0;
    p.ultType = '';
    addFloater(p.x + p.w / 2, p.y - 16, '换枪：' + CONFIG.weapons[pk.weaponId].name, C.CYAN_LIGHT, 18);
    burst(p.x + p.w / 2, p.y + p.h / 2, C.CYAN, 16, 200, 3);
    Sfx.play('upgrade');
  } else if (pk.type === 'chest') {
    const granted = grantRandomUpgrade();
    p.hp = Math.min(CONFIG.player.maxHp, p.hp + 5);
    if (!granted) Game.score += 500;
    addFloater(p.x + p.w / 2, p.y - 18, granted ? '宝箱：随机升级' : '宝箱：+500 分', C.PERFECT, 20);
    burst(p.x + p.w / 2, p.y + p.h / 2, C.PERFECT, 24, 240, 4);
    addShake(4);
    Sfx.play('perfect');
  } else if (pk.type === 'nuke') {
    triggerNuke();
  }
}

function updatePickups(dt) {
  const p = Game.player;
  if (!p || p.dead) return;
  const cfg = CONFIG.pickup;
  const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
  for (let i = Game.pickups.length - 1; i >= 0; i--) {
    const pk = Game.pickups[i];
    pk.life -= dt;
    pk.bob += dt * 3;
    if (pk.life <= 0) { Game.pickups.splice(i, 1); continue; }
    const d = dist(pcx, pcy, pk.x, pk.y);
    if (d < cfg.collectRange) {
      collectPickup(pk);
      Game.pickups.splice(i, 1);
      continue;
    }
    if (d < cfg.magnetRange) {
      const pull = Math.min(1, 260 * dt / Math.max(1, d));
      pk.x += (pcx - pk.x) * pull;
      pk.y += (pcy - pk.y) * pull;
    }
  }
}

// ===== 事件 / 怪物潮 =====
function grantRandomUpgrade() {
  const p = Game.player;
  const ids = Object.keys(UPGRADE_DEFS).filter((id) => upgradeLevel(id) < UPGRADE_DEFS[id].max);
  if (!ids.length) return false;
  const id = ids[Math.floor(rnd() * ids.length)];
  Game.upgrades[id] = upgradeLevel(id) + 1;
  if (id === 'valve' && p) p.heat = Math.min(p.heat, 90);
  const def = UPGRADE_DEFS[id];
  if (p) {
    addFloater(p.x + p.w / 2, p.y - 28, '获得升级：' + def.name, C.PERFECT, 18);
    burst(p.x + p.w / 2, p.y + p.h / 2, C.PERFECT, 18, 220, 3);
  }
  Sfx.play('upgrade');
  return true;
}

function spawnEventForWave() {
  const p = Game.player;
  if (!p) return;
  const type = rnd() < 0.55 ? 'altar' : 'shop';
  for (let tries = 0; tries < 30; tries++) {
    const a = rnd() * Math.PI * 2;
    const r = rndRange(260, 430);
    const x = clamp(p.x + p.w / 2 + Math.cos(a) * r, 80, FIELD.right - 80);
    const y = clamp(p.y + p.h / 2 + Math.sin(a) * r, 80, FIELD.bottom - 80);
    if (!pointHitsObstacle(x, y)) {
      Game.events.push({ type, x, y, bob: rnd() * 6.28, cool: 0 });
      return;
    }
  }
}

function updateEvents(dt) {
  const p = Game.player;
  if (!p || p.dead) return;
  const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
  for (let i = Game.events.length - 1; i >= 0; i--) {
    const ev = Game.events[i];
    ev.bob += dt * 2;
    ev.cool = Math.max(0, ev.cool - dt);
    if (dist(pcx, pcy, ev.x, ev.y) >= 52 || ev.cool > 0) continue;
    if (ev.type === 'altar') {
      if (p.hp <= 15) {
        Game.ui.hintTimer = 1.0; Game.ui.hintText = '生命不足，无法献祭';
        ev.cool = 1.0; continue;
      }
      if (!grantRandomUpgrade()) {
        Game.ui.hintTimer = 1.0; Game.ui.hintText = '升级已满';
        ev.cool = 1.0; continue;
      }
      p.hp -= 15;
      addFloater(ev.x, ev.y - 24, '献祭 -15 HP', C.DANGER, 20);
      addShake(4);
      Game.events.splice(i, 1);
    } else if (ev.type === 'shop') {
      if (Game.score < 400) {
        Game.ui.hintTimer = 1.0; Game.ui.hintText = '分数不足 400';
        ev.cool = 1.0; continue;
      }
      if (!grantRandomUpgrade()) {
        Game.ui.hintTimer = 1.0; Game.ui.hintText = '升级已满';
        ev.cool = 1.0; continue;
      }
      Game.score -= 400;
      addFloater(ev.x, ev.y - 24, '购买升级 -400 分', C.CYAN_LIGHT, 20);
      Sfx.play('perfect');
      Game.events.splice(i, 1);
    }
  }
}

function startHorde() {
  Game.horde = { timer: 12, spawnTimer: 0.2, rewarded: false };
  Game.ui.banner = { text: '怪物潮来袭', timer: 2.2, sub: '坚持 12 秒，结束掉落宝箱' };
  Sfx.play('alarm');
  addShake(6);
}

function updateHorde(dt) {
  const h = Game.horde;
  if (!h) return;
  h.timer -= dt;
  h.spawnTimer -= dt;
  if (h.timer > 0 && h.spawnTimer <= 0 && enemiesActiveCount() < CONFIG.maxActiveEnemies + 4) {
    const pool = Game.wave >= 4
      ? ['charger', 'gunner', 'drone', 'shield', 'bomber']
      : ['charger', 'gunner', 'drone'];
    const type = pool[Math.floor(rnd() * pool.length)];
    const pos = spawnPositionFor(type);
    createEnemy(type, pos.x, pos.y);
    h.spawnTimer = 0.42;
  }
  if (h.timer <= 0 && !h.rewarded) {
    h.rewarded = true;
    const p = Game.player;
    if (p) {
      spawnPickup({ x: p.x + p.w / 2 + 40, y: p.y + p.h / 2 }, 'chest');
      Game.ui.banner = { text: '怪物潮结束', timer: 1.6, sub: '宝箱已掉落' };
    }
    Game.horde = null;
  }
}

