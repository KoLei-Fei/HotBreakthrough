// 通过 Chrome DevTools Protocol 驱动 Edge headless 测试游戏
const { spawn } = require('child_process');
const fs = require('fs');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'file:///D:/ClaudeWork/HotBreakthrough/index.html';
const PORT = 9333;
const OUT_DIR = 'D:/ClaudeWork/temp/shots';

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function waitJson() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch (e) { /* retry */ }
    await sleep(250);
  }
  throw new Error('CDP 端口未就绪');
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = {};
    let nextId = 1;
    const events = [];
    ws.onopen = () => resolve({ ws, send, onEvent: (fn) => events.push(fn) });
    ws.onerror = (e) => reject(new Error('ws error'));
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending[msg.id]) {
        const { resolve: res, reject: rej } = pending[msg.id];
        delete pending[msg.id];
        if (msg.error) rej(new Error(JSON.stringify(msg.error)));
        else res(msg.result);
      } else if (msg.method) {
        for (const fn of events) fn(msg);
      }
    };
    function send(method, params) {
      return new Promise((res, rej) => {
        const id = nextId++;
        pending[id] = { resolve: res, reject: rej };
        ws.send(JSON.stringify({ id, method, params: params || {} }));
      });
    }
  });
}

async function evaluate(send, expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('JS 异常: ' + JSON.stringify(r.exceptionDetails));
  return r.result ? r.result.value : undefined;
}

async function screenshot(send, name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  const path = OUT_DIR + '/' + name + '.png';
  fs.writeFileSync(path, Buffer.from(r.data, 'base64'));
  console.log('SHOT ' + path);
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const child = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=D:/ClaudeWork/temp/edge-profile-test',
    '--window-size=1280,720',
    URL + '?debug=1'
  ], { stdio: 'ignore' });

  const errors = [];
  try {
    const page = await waitJson();
    const conn = await connect(page.webSocketDebuggerUrl);
    await conn.send('Runtime.enable');
    await conn.send('Page.enable');
    conn.onEvent((e) => {
      if (e.method === 'Runtime.exceptionThrown') {
        errors.push(e.params.exceptionDetails.text + ' ' + (e.params.exceptionDetails.exception?.description || ''));
      }
      if (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') {
        errors.push('console.error');
      }
    });

    await sleep(500);

    // 1. 标题页
    await screenshot(conn.send, '01_title');

    // 2. 开始游戏（脉冲步枪）并推进
    await evaluate(conn.send, "__afterheatDebug.start('pulse')");
    await evaluate(conn.send, '__afterheatDebug.step(90)');
    await screenshot(conn.send, '02_playing');
    console.log('SNAP_PLAYING ' + JSON.stringify(await evaluate(conn.send, '__afterheatDebug.snapshot()')));

    // 3. 鼠标瞄准并持续射击
    await evaluate(conn.send, '__afterheatDebug.setMouse(900, 400, true)');
    await evaluate(conn.send, '__afterheatDebug.step(240)');
    await screenshot(conn.send, '03_shooting');
    console.log('SNAP_SHOOT ' + JSON.stringify(await evaluate(conn.send, '__afterheatDebug.snapshot()')));

    // 4. 清空敌人触发升级页
    await evaluate(conn.send, '__afterheatDebug.killAll()');
    await evaluate(conn.send, '__afterheatDebug.step(10)');
    await screenshot(conn.send, '04_upgrade');
    console.log('SNAP_UPGRADE ' + JSON.stringify(await evaluate(conn.send, '__afterheatDebug.snapshot()')));

    // 5. 直接进入 Boss
    await evaluate(conn.send, '__afterheatDebug.start(\'pulse\')');
    await evaluate(conn.send, '__afterheatDebug.step(30)');
    await evaluate(conn.send, '__afterheatDebug.startBoss()');
    await evaluate(conn.send, '__afterheatDebug.step(90)');
    await screenshot(conn.send, '05_boss');
    console.log('SNAP_BOSS ' + JSON.stringify(await evaluate(conn.send, '__afterheatDebug.snapshot()')));

    // 6. 玩家致死触发结算
    await evaluate(conn.send, 'const g=__afterheatDebug.Game; g.player.hp=0; g.player.dead=true; g.state="DEFEAT"; g.lastResult={win:false,mode:g.mode,weapon:"脉冲步枪",time:g.time,maxCombo:g.maxCombo,shotsFired:g.shotsFired,shotsHit:g.shotsHit,accuracy:0,perfectVents:g.perfectVents,overheatCount:g.overheatCount,score:g.score,upgrades:[],seed:g.seedText};');
    await evaluate(conn.send, '__afterheatDebug.step(5)');
    await screenshot(conn.send, '06_defeat');

    console.log('ERRORS ' + JSON.stringify(errors));
  } catch (e) {
    console.log('TEST_FAIL ' + e.message);
    console.log('ERRORS ' + JSON.stringify(errors));
  } finally {
    child.kill();
  }
})();
