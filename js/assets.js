// assets.js — 余热突围拆分模块
// ===== 素材清单 =====
const G = 'assets/game/';
const SPRITE_FILES = {
  // 武器图标（标题页 / HUD）使用 UI 图标，避免像素枪贴图被拉伸
  wicon_pulse: 'assets/ui/icon_pulse.png',
  wicon_swarm: 'assets/ui/icon_swarm.png',
  wicon_rail: 'assets/ui/icon_rail.png',
  crosshair: G + 'weapons/weapon_0025.png',
  boss: G + 'boss.png',
  // 高分辨率角色与敌人（48×48 透明 PNG，优先使用；缺失时回退旧像素帧）
  hr_player: G + 'hr/player.png',
  hr_player_back: G + 'hr/player_back.png',
  hr_player_side: G + 'hr/player_side.png',
  hr_charger: G + 'hr/charger.png',
  hr_gunner: G + 'hr/gunner.png',
  hr_drone: G + 'hr/drone.png',
  hr_shield: G + 'hr/shield.png',
  hr_bomber: G + 'hr/bomber.png',
  // 高分辨率掩体与植被（48×48）
  hr_crate: G + 'hr/crate.png',
  hr_crate2: G + 'hr/crate2.png',
  hr_barrel: G + 'hr/barrel.png',
  hr_rock: G + 'hr/rock.png',
  hr_tree: G + 'hr/tree.png',
  hr_cactus: G + 'hr/cactus.png',
  hr_bush: G + 'hr/bush.png',
  hr_pillar: G + 'hr/pillar.png',
  hr_wall: G + 'hr/wall.png',
  hr_pot: G + 'hr/pot.png',
  hr_lamp: G + 'hr/lamp.png',
  hr_sign: G + 'hr/sign.png',
  // 角色方向帧：0下 1右 2上 3左。素材第 4 帧是倒地死亡帧，全部弃用。
  player_0: G + 'players/player_0001.png',
  player_1: G + 'players/player_0002.png',
  player_2: G + 'players/player_0001.png',
  player_3: G + 'players/player_0000.png',
  bomber_0: G + 'players/player_0004.png',
  bomber_1: G + 'players/player_0004.png',
  bomber_2: G + 'players/player_0004.png',
  bomber_3: G + 'players/player_0004.png',
  // 敌人方向帧（同样排除各套的死亡帧）
  drone_0: G + 'enemies/enemy_0000.png', drone_1: G + 'enemies/enemy_0001.png', drone_2: G + 'enemies/enemy_0002.png', drone_3: G + 'enemies/enemy_0000.png',
  gunner_0: G + 'enemies/enemy_0004.png', gunner_1: G + 'enemies/enemy_0004.png', gunner_2: G + 'enemies/enemy_0004.png', gunner_3: G + 'enemies/enemy_0004.png',
  charger_0: G + 'enemies/enemy_0009.png', charger_1: G + 'enemies/enemy_0009.png', charger_2: G + 'enemies/enemy_0010.png', charger_3: G + 'enemies/enemy_0008.png',
  shield_0: G + 'enemies/enemy_0013.png', shield_1: G + 'enemies/enemy_0014.png', shield_2: G + 'enemies/enemy_0013.png', shield_3: G + 'enemies/enemy_0012.png',
  // 高细节地面纹理：每套地图铺一张 1220×444 的完整地面图
  ground_sand: G + 'grounds/sand_ground.png',
  ground_purple: G + 'grounds/purple_ground.png',
  ground_mint: G + 'grounds/mint_ground.png',
  ground_sand_world: G + 'grounds/sand_world.png',
  ground_purple_world: G + 'grounds/purple_world.png',
  ground_mint_world: G + 'grounds/mint_world.png',
  // 地形（地面纯色瓦片保留作纹理缺失时的备用）
  sand: G + 'tiles/tile_0064.png', sand2: G + 'tiles/tile_0065.png',
  purple: G + 'tiles/tile_0109.png', purple2: G + 'tiles/tile_0019.png',
  grass: G + 'tiles/tile_0024.png', grass2: G + 'tiles/tile_0024.png',
  crate: G + 'tiles/tile_0150.png', crate2: G + 'tiles/tile_0168.png',
  cactus: G + 'tiles/tile_0081.png', tree: G + 'tiles/tile_0080.png',
  rock: G + 'tiles/tile_0076.png', sign: G + 'tiles/tile_0049.png',
  pillar: G + 'tiles/tile_0057.png', wall: G + 'tiles/tile_0204.png',
  bush: G + 'tiles/tile_0039.png', lamp: G + 'tiles/tile_0069.png',
  // 小装饰：营地杂物、碎石、骸骨、紫晶灯杆、绿洲仙人掌
  pot: G + 'tiles/tile_0059.png', cactus2: G + 'tiles/tile_0063.png',
  pole: G + 'tiles/tile_0086.png', bush2: G + 'tiles/tile_0044.png',
  // 更细致的桶状掩体
  barrel: G + 'tiles/tile_0201.png', barrel2: G + 'tiles/tile_0202.png',
  barrel3: G + 'tiles/tile_0203.png'
};
// 地图素材别名 -> 高清版本 key（不在表中的保持旧像素瓦片）
const HR_PROP = {
  crate: 'crate', crate2: 'crate2',
  barrel: 'barrel', barrel2: 'barrel', barrel3: 'barrel',
  rock: 'rock', tree: 'tree',
  cactus: 'cactus', cactus2: 'cactus',
  bush: 'bush',
  pillar: 'pillar', wall: 'wall', pot: 'pot',
  lamp: 'lamp', pole: 'lamp', sign: 'sign'
};

const UPGRADE_ICONS = {
  valve: 'assets/ui/icon_upgrade_valve.png',
  vent_burst: 'assets/ui/icon_upgrade_vent_burst.png',
  burn: 'assets/ui/icon_upgrade_burn.png',
  dash_hit: 'assets/ui/icon_upgrade_dash_hit.png',
  dash_cd: 'assets/ui/icon_upgrade_dash_cd.png',
  dash_echo: 'assets/ui/icon_upgrade_dash_echo.png',
  swift_boots: 'assets/ui/icon_upgrade_swift_boots.png',
  stable_grip: 'assets/ui/icon_upgrade_stable_grip.png',
  rapid: 'assets/ui/icon_upgrade_rapid.png',
  crit: 'assets/ui/icon_upgrade_crit.png',
  bounce: 'assets/ui/icon_upgrade_bounce.png',
  pierce: 'assets/ui/icon_upgrade_pierce.png'
};
const SOUND_FILES = {
  shoot: 'shoot-a.ogg', rail: 'shoot-f.ogg', hit: 'hurt-a.ogg',
  kill: 'explosion-a.ogg', dash: 'move-a.ogg', vent: 'explosion-b.ogg',
  perfect: 'coin-a.ogg', overheat: 'error-a.ogg', upgrade: 'select-a.ogg',
  alarm: 'error-b.ogg', hurt: 'hurt-c.ogg', victory: 'coin-d.ogg', defeat: 'lose-a.ogg'
};

// ===== 音效（Kenney .ogg） =====
const Sfx = {
  muted: false,
  clips: {},
  init() {
    for (const name in SOUND_FILES) {
      try {
        const a = new Audio(G + 'sounds/' + SOUND_FILES[name]);
        a.preload = 'auto';
        this.clips[name] = a;
      } catch (e) { /* 忽略 */ }
    }
  },
  ensure() { /* 浏览器在首次用户交互后允许播放，无需额外初始化 */ },
  play(name) {
    if (this.muted) return;
    const c = this.clips[name];
    if (!c) return;
    try {
      const n = c.cloneNode();
      n.volume = 0.35;
      const p = n.play();
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* 忽略 */ }
  }
};

// ===== 资源加载 =====
const Assets = {
  images: {},
  ready: false,
  load() {
    const all = Object.assign({}, SPRITE_FILES);
    for (const k in UPGRADE_ICONS) all['upg_' + k] = UPGRADE_ICONS[k];
    let pending = 0;
    for (const key in all) {
      const img = new Image();
      pending++;
      const done = () => { pending--; if (pending === 0) Assets.ready = true; };
      img.onload = done;
      img.onerror = done;
      img.src = all[key];
      this.images[key] = img;
    }
    if (pending === 0) this.ready = true;
  },
  get(key) {
    const img = this.images[key];
    return (img && img.complete && img.naturalWidth > 0) ? img : null;
  },
  // 命中闪白：生成与精灵轮廓一致的白色剪影，避免整块白矩形
  whiteCache: {},
  white(key) {
    if (this.whiteCache[key]) return this.whiteCache[key];
    const img = this.get(key);
    if (!img) return null;
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, c.width, c.height);
    this.whiteCache[key] = c;
    return c;
  },
  // 角色帧：dir 0下 1右 2上 3左
  frame(prefix, dir) {
    return this.get(prefix + '_' + dir) || this.get(prefix + '_0');
  }
};

