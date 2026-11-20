// profile.js — 余热突围拆分模块
// 玩家名称输入（可见 DOM input，支持中文 IME）
const NAME_MAX = 15;
const NAME_LIMIT = 15;
const NAME_STORAGE_KEY = 'afterheat_player_name';
const NAME_RECT = { x: 400, y: 536, w: 360, h: 42 };

const ProfileInput = {
  el: null,
  composing: false,

  init() {
    if (this.el) return;
    const el = document.createElement('input');
    el.type = 'text';
    el.id = 'playerNameInput';
    el.autocomplete = 'off';
    el.spellcheck = false;
    el.maxLength = 30;
    el.placeholder = '输入游戏名称（最多 15 字）';
    el.setAttribute('aria-label', '游戏名称');
    Object.assign(el.style, {
      position: 'fixed',
      zIndex: 5,
      display: 'none',
      boxSizing: 'border-box',
      padding: '0 14px',
      background: 'rgba(8,16,24,0.9)',
      color: '#E8F3F5',
      border: '2px solid #39D9E6',
      outline: 'none',
      font: '15px "Microsoft YaHei","PingFang SC",sans-serif',
      letterSpacing: '0.5px',
      clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)'
    });
    document.body.appendChild(el);
    this.el = el;

    try {
      const saved = localStorage.getItem(NAME_STORAGE_KEY);
      if (saved) el.value = this.sanitize(saved);
    } catch (e) { /* ignore */ }

    el.addEventListener('compositionstart', () => { this.composing = true; });
    el.addEventListener('compositionend', () => {
      this.composing = false;
      this.applyFilter();
    });
    el.addEventListener('input', () => {
      if (!this.composing) this.applyFilter();
    });
    el.addEventListener('change', () => this.remember());
    el.addEventListener('blur', () => this.remember());
  },

  sanitize(value) {
    return Array.from(String(value || ''))
      .filter((ch) => /[0-9A-Za-z㐀-䶿一-鿿]/.test(ch))
      .slice(0, NAME_LIMIT)
      .join('');
  },

  applyFilter() {
    if (!this.el) return;
    const clean = this.sanitize(this.el.value);
    if (clean !== this.el.value) this.el.value = clean;
  },

  remember() {
    if (!this.el) return;
    const clean = this.sanitize(this.el.value);
    try {
      if (clean) localStorage.setItem(NAME_STORAGE_KEY, clean);
      else localStorage.removeItem(NAME_STORAGE_KEY);
    } catch (e) { /* ignore */ }
  },

  getName() {
    const clean = this.el ? this.sanitize(this.el.value) : '';
    this.remember();
    return clean || '匿名玩家';
  },

  setValue(v) {
    if (!this.el) return;
    this.el.value = this.sanitize(v);
  },

  syncLayout() {
    if (!this.el) return;
    const canvas = document.getElementById('game');
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const scale = r.width / W;
    this.el.style.left = (r.left + NAME_RECT.x * scale) + 'px';
    this.el.style.top = (r.top + NAME_RECT.y * scale) + 'px';
    this.el.style.width = (NAME_RECT.w * scale) + 'px';
    this.el.style.height = (NAME_RECT.h * scale) + 'px';
    this.el.style.fontSize = (15 * scale) + 'px';
    this.el.style.padding = '0 ' + (14 * scale) + 'px';
  },

  show() {
    if (!this.el) return;
    this.syncLayout();
    this.el.style.display = 'block';
  },

  hide() {
    if (!this.el) return;
    this.el.blur();
    this.el.style.display = 'none';
  },

  setVisible(v) {
    if (!this.el) return;
    if (v && this.el.style.display !== 'block') this.show();
    else if (!v && this.el.style.display !== 'none') this.hide();
  }
};
