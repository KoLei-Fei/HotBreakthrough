// state.js — 余热突围拆分模块
// ===== 游戏状态 =====
const Game = {
  state: 'TITLE',
  prevState: null,
  mode: 'normal',
  weaponId: 'pulse',
  seedText: '',
  rng: null,
  time: 0,
  wave: 0,
  score: 0,
  combo: 0,
  comboTimer: 0,
  maxCombo: 0,
  shotsFired: 0,
  shotsHit: 0,
  perfectVents: 0,
  overheatCount: 0,
  player: null,
  enemies: [],
  pBullets: [],
  eBullets: [],
  particles: [],
  floaters: [],
  boss: null,
  pendingSpawn: [],
  upgrades: {},
  wavePhase: 'fighting', // fighting | cleared | boss | victory
  shake: 0,
  hitStop: 0,
  upgradeChoices: [],
  upgradeHadBehavioral: false,
  upgradeSelections: 0,
  ui: { hover: null, pressed: null, hintTimer: 0, hintText: '' },
  banner: null,
  platforms: [],
  map: null,
  obstacles: [],
  decor: [],
  blasts: [],
  bossIntroTimer: 0,
  lastResult: null,
  newRecordFlags: {},
  cam: { x: 0, y: 0 },
  pickups: [],
  events: [],
  killFeed: [],
  horde: null,
  slowMo: 0,
  flash: 0,
  dropDry: 0
};

// ===== 相机 =====
function snapCamera() {
  const p = Game.player;
  if (!p) { Game.cam.x = 0; Game.cam.y = 0; return; }
  Game.cam.x = clamp(p.x + p.w / 2 - VIEW.w / 2, 0, FIELD.right - VIEW.w);
  Game.cam.y = clamp(p.y + p.h / 2 - VIEW.h / 2, 0, FIELD.bottom - VIEW.h);
}

function updateCamera(dt) {
  const p = Game.player;
  if (!p) return;
  const px = p.x + p.w / 2, py = p.y + p.h / 2;
  let tx = Game.cam.x, ty = Game.cam.y;
  if (Game.bossIntroTimer > 0 && Game.boss && Game.boss.alive) {
    const b = Game.boss;
    const mx = (px + b.x + b.w / 2) / 2, my = (py + b.y + b.h / 2) / 2;
    tx = clamp(mx - VIEW.w / 2, 0, FIELD.right - VIEW.w);
    ty = clamp(my - VIEW.h / 2, 0, FIELD.bottom - VIEW.h);
    const kk = 1 - Math.pow(0.0008, dt);
    Game.cam.x = lerp(Game.cam.x, tx, kk);
    Game.cam.y = lerp(Game.cam.y, ty, kk);
    return;
  }
  // 中央死区，角色接近视口边缘时镜头才跟进
  const deadL = VIEW.w * 0.32, deadR = VIEW.w * 0.68;
  const deadT = VIEW.h * 0.30, deadB = VIEW.h * 0.70;
  const sx = px - Game.cam.x, sy = py - Game.cam.y;
  if (sx < deadL) tx = px - deadL;
  else if (sx > deadR) tx = px - deadR;
  if (sy < deadT) ty = py - deadT;
  else if (sy > deadB) ty = py - deadB;
  tx = clamp(tx, 0, FIELD.right - VIEW.w);
  ty = clamp(ty, 0, FIELD.bottom - VIEW.h);
  const k = 1 - Math.pow(0.0015, dt);
  Game.cam.x = clamp(lerp(Game.cam.x, tx, k), 0, FIELD.right - VIEW.w);
  Game.cam.y = clamp(lerp(Game.cam.y, ty, k), 0, FIELD.bottom - VIEW.h);
}

