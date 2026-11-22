// maps.js — 余热突围拆分模块
// ===== 俯视地图（每两波切换一套主题） =====
// VIEW：屏幕上的可视区；FIELD：大世界边界（相机在其中移动）
const VIEW = { left: 30, top: 156, w: 1220, h: 444 };
const FIELD = { left: 0, right: 2440, top: 0, bottom: 888 };
const TILE = 48; // 16px 素材的整数 3 倍，关闭平滑后保持像素清晰

// 每套地图：ground 平铺名、ground2 点缀、decor 装饰、obstacles 掩体（挡移动与子弹）
const MAPS = [
  {
    name: '沙漠营地',
    ground: 'sand', ground2: 'sand2', groundTex: 'ground_sand', groundTexWorld: 'ground_sand_world', groundDim: 0.08, tint: null, fallbackColor: '#e0a878',
    obstacles: [
      { tile: 'crate', x: 300, y: 300 }, { tile: 'crate', x: 356, y: 300 },
      { tile: 'crate', x: 880, y: 300 }, { tile: 'crate', x: 936, y: 300 },
      { tile: 'crate2', x: 600, y: 440 }, { tile: 'crate2', x: 656, y: 440 },
      { tile: 'barrel', x: 200, y: 470 }, { tile: 'barrel2', x: 1020, y: 470 }
    ],
    decor: [
      { tile: 'cactus', x: 90, y: 200 }, { tile: 'cactus', x: 1160, y: 210 },
      { tile: 'cactus', x: 130, y: 560 }, { tile: 'tree', x: 1120, y: 560 },
      { tile: 'sign', x: 640, y: 190 }, { tile: 'rock', x: 480, y: 230 },
      { tile: 'cactus', x: 760, y: 540 }, { tile: 'rock', x: 850, y: 220 },
      { tile: 'pot', x: 180, y: 330 }, { tile: 'cactus', x: 420, y: 220 },
      { tile: 'rock', x: 900, y: 520 }, { tile: 'rock', x: 760, y: 470 },
      { tile: 'cactus', x: 1120, y: 420 },
      { tile: 'cactus', x: 250, y: 380 }, { tile: 'rock', x: 1000, y: 300 },
      { tile: 'cactus', x: 560, y: 560 }, { tile: 'pot', x: 300, y: 200 },
      { tile: 'rock', x: 700, y: 340 }
    ]
  },
  {
    name: '紫晶遗迹',
    ground: 'purple', ground2: 'purple2', groundTex: 'ground_purple', groundTexWorld: 'ground_purple_world', groundDim: 0.06, tint: null, fallbackColor: '#8f7fa8',
    obstacles: [
      { tile: 'pillar', x: 260, y: 260 }, { tile: 'pillar', x: 260, y: 316 },
      { tile: 'pillar', x: 980, y: 260 }, { tile: 'pillar', x: 980, y: 316 },
      { tile: 'wall', x: 600, y: 300 }, { tile: 'wall', x: 656, y: 300 },
      { tile: 'bush', x: 440, y: 480 }, { tile: 'bush', x: 800, y: 480 }
    ],
    decor: [
      { tile: 'lamp', x: 80, y: 200 }, { tile: 'pillar', x: 1170, y: 210 },
      { tile: 'bush', x: 180, y: 560 }, { tile: 'bush', x: 1090, y: 560 },
      { tile: 'lamp', x: 640, y: 520 }, { tile: 'pillar', x: 500, y: 200 },
      { tile: 'pillar', x: 760, y: 200 },
      { tile: 'pole', x: 900, y: 210 }, { tile: 'bush', x: 720, y: 420 },
      { tile: 'bush', x: 350, y: 400 }, { tile: 'pole', x: 140, y: 420 },
      { tile: 'pole', x: 1060, y: 500 },
      { tile: 'bush', x: 120, y: 300 }, { tile: 'pole', x: 420, y: 560 },
      { tile: 'bush', x: 860, y: 300 }, { tile: 'bush', x: 520, y: 360 }
    ]
  },
  {
    name: '绿洲前哨',
    ground: 'grass', ground2: 'grass2', groundTex: 'ground_mint', groundTexWorld: 'ground_mint_world', groundDim: 0.08, tint: null, fallbackColor: '#7fbfae',
    obstacles: [
      { tile: 'crate2', x: 340, y: 340 }, { tile: 'crate2', x: 396, y: 340 },
      { tile: 'crate', x: 830, y: 340 }, { tile: 'crate', x: 886, y: 340 },
      { tile: 'barrel3', x: 620, y: 260 }, { tile: 'rock', x: 620, y: 480 },
      { tile: 'tree', x: 200, y: 300 }, { tile: 'tree', x: 1040, y: 300 }
    ],
    decor: [
      { tile: 'tree', x: 90, y: 210 }, { tile: 'tree', x: 1170, y: 220 },
      { tile: 'cactus', x: 150, y: 560 }, { tile: 'tree', x: 1120, y: 570 },
      { tile: 'sign', x: 640, y: 190 }, { tile: 'cactus', x: 480, y: 540 },
      { tile: 'tree', x: 800, y: 540 }, { tile: 'rock', x: 300, y: 200 },
      { tile: 'cactus2', x: 720, y: 260 }, { tile: 'cactus2', x: 980, y: 470 },
      { tile: 'rock', x: 560, y: 560 }, { tile: 'rock', x: 250, y: 480 },
      { tile: 'pot', x: 900, y: 220 }, { tile: 'cactus2', x: 1060, y: 420 },
      { tile: 'cactus2', x: 150, y: 420 }, { tile: 'bush2', x: 500, y: 220 },
      { tile: 'cactus', x: 300, y: 560 }, { tile: 'rock', x: 780, y: 220 }
    ]
  }
];

function levelSetForWave(wave) {
  return MAPS[Math.min(MAPS.length - 1, Math.floor((wave - 1) / 2))];
}

function setMap(map) {
  Game.map = map;
  // 把单屏布局扩展成 2×2 大世界，并清空出生点附近的掩体
  const offs = [
    { x: 0, y: 0 }, { x: 1220, y: 0 },
    { x: 0, y: 444 }, { x: 1220, y: 444 }
  ];
  const spawnX = FIELD.right / 2, spawnY = FIELD.bottom / 2;
  const obs = [], dec = [];
  for (let oi = 0; oi < offs.length; oi++) {
    const off = offs[oi];
    const srcObs = map.obstacles || [];
    for (let i = 0; i < srcObs.length; i++) {
      const o = srcObs[i];
      let x = o.x + off.x + ((oi * 13 + i * 7) % 29) - 14;
      let y = (o.y - 156) + off.y + ((oi * 17 + i * 5) % 25) - 12;
      x = clamp(x, 10, FIELD.right - OB - 10);
      y = clamp(y, 10, FIELD.bottom - OB - 10);
      if (dist(x + OB / 2, y + OB / 2, spawnX, spawnY) < 150) continue;
      obs.push({ x, y, w: OB, h: OB, tile: o.tile });
    }
    const srcDec = map.decor || [];
    for (let i = 0; i < srcDec.length; i++) {
      const d = srcDec[i];
      let x = d.x + off.x + ((oi * 11 + i * 9) % 37) - 18;
      let y = (d.y - 156) + off.y + ((oi * 19 + i * 7) % 31) - 15;
      x = clamp(x, 6, FIELD.right - TILE - 6);
      y = clamp(y, 6, FIELD.bottom - TILE - 6);
      if (dist(x + TILE / 2, y + TILE / 2, spawnX, spawnY) < 85) continue;
      dec.push({ x, y, tile: d.tile });
    }
  }
  Game.obstacles = obs;
  Game.decor = dec;
}

