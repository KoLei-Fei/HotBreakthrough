// 输出全尺寸游玩截图用于交付预览
const { spawn } = require('child_process');
const fs = require('fs');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9342;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const child = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-first-run',
    '--force-device-scale-factor=1',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=D:/ClaudeWork/temp/edge-preview',
    '--window-size=1280,720',
    'file:///D:/ClaudeWork/HotBreakthrough/index.html'
  ], { stdio: 'ignore' });

  try {
    let page;
    for (let i = 0; i < 40; i++) {
      try {
        const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
        const l = await r.json();
        page = l.find((t) => t.type === 'page');
        if (page) break;
      } catch (e) {}
      await sleep(300);
    }
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));
    let id = 0;
    const pending = {};
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending[m.id]) { pending[m.id](m.result); delete pending[m.id]; }
    };
    const send = (method, params) => new Promise((r) => {
      const i = ++id; pending[i] = r;
      ws.send(JSON.stringify({ id: i, method, params: params || {} }));
    });
    const ev = async (e) => {
      const r = await send('Runtime.evaluate', { expression: e, returnByValue: true });
      return r.result ? r.result.value : null;
    };
    for (let i = 0; i < 40; i++) {
      if (await ev('typeof window.__afterheatDebug !== "undefined"')) break;
      await sleep(250);
    }
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });

    // 等待标题页关键图标加载
    for (let i = 0; i < 40; i++) {
      if ((await ev('__afterheatDebug.assetsState()'))?.criticalReady) break;
      await sleep(200);
    }

    // 标题页
    let r0 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('D:/ClaudeWork/HotBreakthrough/preview/screenshot_title.png', Buffer.from(r0.data, 'base64'));
    console.log('saved title');

    // 预览前加载全部资源，避免截图出现回退图形
    await ev('__afterheatDebug.preloadAll()');
    for (let i = 0; i < 60; i++) {
      const missing = await ev('__afterheatDebug.missingAssets()');
      if (!missing.length) break;
      await sleep(200);
    }

    // 排行榜面板（示例数据，仅用于预览）
    await ev('__afterheatDebug.mockLeaderboard()');
    await ev('__afterheatDebug.step(0)');
    r0 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('D:/ClaudeWork/HotBreakthrough/preview/screenshot_leaderboard.png', Buffer.from(r0.data, 'base64'));
    console.log('saved leaderboard');
    await ev('__afterheatDebug.closeLeaderboard()');
    await ev('__afterheatDebug.step(0)');

    // 游玩画面：瞄准最近的敌人开火
    await ev("__afterheatDebug.start('pulse')");
    await ev('__afterheatDebug.step(70)');
    const epos = await ev('__afterheatDebug.enemyPositions()');
    const aims = (epos || []).slice(0, 3);
    if (aims.length) {
      for (const a of aims) {
        await ev(`__afterheatDebug.aimAt(${a.x}, ${a.y}, true)`);
        await ev('__afterheatDebug.step(20)');
      }
    }
    await ev('__afterheatDebug.setMouse(950, 500, false)');
    await ev('__afterheatDebug.step(6)');
    let r = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('D:/ClaudeWork/HotBreakthrough/preview/screenshot_playing.png', Buffer.from(r.data, 'base64'));
    console.log('saved playing');
    console.log('stats after playing', JSON.stringify(await ev('__afterheatDebug.snapshot()')));

    // 升级画面（固定展示新图标）
    await ev('__afterheatDebug.killAll()');
    await ev('__afterheatDebug.step(10)');
    await ev('__afterheatDebug.Game.upgradeChoices = ["swift_boots","stable_grip","rapid"]');
    await ev('__afterheatDebug.step(0)');
    r = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('D:/ClaudeWork/HotBreakthrough/preview/screenshot_upgrade.png', Buffer.from(r.data, 'base64'));
    console.log('saved upgrade');

    // 继续本局：选择升级后进入 Boss，保留命中与升级统计
    await ev('__afterheatDebug.pickUpgrade(0)');
    await ev('__afterheatDebug.step(30)');
    await ev('__afterheatDebug.startBoss()');
    await ev('(() => { const b = __afterheatDebug.Game.boss; __afterheatDebug.aimAt(b.x + b.w / 2, b.y + b.h / 2, true); })()');
    await ev('__afterheatDebug.step(10)');
    r = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('D:/ClaudeWork/HotBreakthrough/preview/screenshot_boss_intro.png', Buffer.from(r.data, 'base64'));
    console.log('saved boss intro');
    await ev('__afterheatDebug.step(120)');
    await ev('__afterheatDebug.hitBoss(1800)');
    await ev('(() => { const b = __afterheatDebug.Game.boss; __afterheatDebug.aimAt(b.x + b.w / 2, b.y + b.h / 2, false); })()');
    await ev('__afterheatDebug.step(20)');
    console.log('boss layout', JSON.stringify(await ev('({ player: { x: __afterheatDebug.Game.player.x, y: __afterheatDebug.Game.player.y }, cam: __afterheatDebug.Game.cam, boss: __afterheatDebug.Game.boss ? { x: __afterheatDebug.Game.boss.x, y: __afterheatDebug.Game.boss.y } : null })')));
    r = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('D:/ClaudeWork/HotBreakthrough/preview/screenshot_boss.png', Buffer.from(r.data, 'base64'));
    console.log('saved boss');

    // 胜利画面
    await ev('__afterheatDebug.hitBoss(99999)');
    await ev('__afterheatDebug.step(30)');
    r = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('D:/ClaudeWork/HotBreakthrough/preview/screenshot_victory.png', Buffer.from(r.data, 'base64'));
    console.log('saved victory');
    console.log('result', JSON.stringify(await ev('__afterheatDebug.Game.lastResult')));
  } catch (e) {
    console.log('FAIL ' + e.message);
  } finally {
    child.kill();
  }
})();
