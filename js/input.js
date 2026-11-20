// input.js — 余热突围拆分模块
// ===== 输入 =====
const Input = {
  keys: new Set(),
  pressed: new Set(),
  mouse: { x: W / 2, y: H / 2, down: false, pressed: false },
  anyPress: false,
  init(canvas) {
    window.addEventListener('keydown', (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
      if (!e.repeat) {
        Input.pressed.add(k);
        Input.anyPress = true;
      }
      Input.keys.add(k);
    });
    window.addEventListener('keyup', (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      Input.keys.delete(k);
    });
    window.addEventListener('blur', () => {
      Input.keys.clear();
    });
    const toLogical = (ev) => {
      const r = canvas.getBoundingClientRect();
      const x = (ev.clientX - r.left) / r.width * W;
      const y = (ev.clientY - r.top) / r.height * H;
      return { x, y };
    };
    canvas.addEventListener('mousemove', (e) => {
      const p = toLogical(e);
      Input.mouse.x = p.x; Input.mouse.y = p.y;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { Input.mouse.down = true; Input.mouse.pressed = true; Input.anyPress = true; }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) Input.mouse.down = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  },
  isDown(...ks) { return ks.some((k) => Input.keys.has(k)); },
  consumePress(k) {
    if (Input.pressed.has(k)) { Input.pressed.delete(k); return true; }
    return false;
  },
  endFrame() {
    Input.pressed.clear();
    Input.mouse.pressed = false;
    Input.anyPress = false;
  }
};

