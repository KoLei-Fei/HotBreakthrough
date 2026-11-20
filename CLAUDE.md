# 余热突围 — 项目结构（重要：先读这里，不要先读旧单文件）

浏览器直接打开 `index.html` 即可运行；不要使用 ES module（file:// 会拦截），全部是经典脚本，共享全局作用域。

## 模块地图

| 文件 | 职责 |
|---|---|
| `index.html` | 仅 canvas、CSS、按顺序引入 `js/*.js` |
| `js/config.js` | W/H、色板 `C`、`CONFIG`（玩家/武器/敌人/波次/Boss/掉落）、`UPGRADE_DEFS` |
| `js/utils.js` | 数学工具、随机数、`Storage`、粒子/浮字 |
| `js/state.js` | `Game` 全局状态、相机 `snapCamera/updateCamera` |
| `js/assets.js` | 素材路径清单、`Assets` 加载、`Sfx` 音效 |
| `js/input.js` | 键鼠输入 |
| `js/maps.js` | 三套地图布局、`setMap`（大世界扩展、掩体生成） |
| `js/player.js` | 玩家创建、WASD 移动/碰撞、鼠标朝向、泄压、武器开火、大招/进化 |
| `js/enemies.js` | 敌人创建、出生点、AI |
| `js/bullets.js` | 子弹构造/更新、伤害/击杀/计分、轰炸 |
| `js/loot.js` | 掉落物、生命/换枪/核弹/精英宝箱、祭坛/商店事件、怪物潮 |
| `js/boss.js` | Boss 登场/阶段/装甲/处决/伤害 |
| `js/systems.js` | 波次、升级抽取、结算、主更新与状态迁移 |
| `js/render.js` | 世界绘制、特效、拾取/事件、准星、Boss 入场/屏幕效果、头顶名称 |
| `js/profile.js` | 名称输入 DOM、IME、字符过滤、本地记忆 |
| `js/leaderboard-client.js` | 排行榜 HTTP 客户端；唯一 fetch 入口 |
| `js/leaderboard-panel.js` | 标题页排行榜前 10 面板 |
| `js/ui.js` | HUD、标题页、升级页、暂停/结算 |
| `js/main.js` | canvas 初始化、主循环、开局/重置、开始/结束时间、更新分派、调试接口 |
| `netlify/functions/records.js` | `GET/POST /api/records`，Netlify Blobs 存储 |
| `netlify/lib/rating.js` | 服务端评分/字段校验（纯函数） |
| `netlify.toml` / `package.json` | Netlify 静态发布、Functions、Blobs 依赖 |

## 修改原则

- 只读/改与任务相关的模块，避免打开 `index_monolith_backup.html`（旧版 3800+ 行备份，仅用于回滚）。
- 需要全项目搜索时用 `grep`/Grep 定位，不要整文件通读。
- 不要使用 `type="module"`；不要把逻辑重新塞回 `index.html`。
- 新增脚本必须挂在 `index.html` 中且放在依赖它的文件之前。
- 全局 `const`/函数跨经典脚本共享；避免重复声明同名变量。

## 开发取舍（YAGNI / 最小实现）

- 先判断“这个功能是否真的需要”；能不加就不加，能复用就不新建。
- 优先复用现有模块、函数和配置表；同一机制不要做第二套平行实现。
- 不新增依赖、构建工具、ES module，也不为“以后可能用到”预留接口或抽象。
- 能在现有模块内扩展就不新建文件；新增脚本必须按依赖顺序挂到 `index.html`。
- 只改与任务直接相关的内容；不顺手重构、格式化、改名或清理无关代码，发现其他问题只提示。
- **不要为了少写代码牺牲**：输入校验、错误处理、边界情况、状态清理、可玩性反馈和视觉可读性；这些属于需求，不算冗余。
- 可调数值放 `js/config.js`；机制放对应模块，避免数值散落。
- 每次改动做最小验证：相关 `js` 文件 `node --check`，再跑 `node tools/SmokeTopDown.js`；涉及画面再跑 `node tools/CapturePreview.js`。
- 临时简化可以留 `// 简化:` 注释，写清原因和后续升级条件，避免无声技术债。

## 测试与素材

- 回归测试：`node tools/SmokeTopDown.js`（含素材加载/名称/排行榜面板/拾取/大招/事件/怪物潮/相机/Boss 装甲与处决）。
- 预览截图：`node tools/CapturePreview.js`（输出到 `preview/`）。
- 高清精灵：`assets/game/hr/`；地面：`assets/game/grounds/`；原始 AI 图：`assets/game/_raw/`。
- 精灵处理：`python -I tools/ProcessSprite.py ...`；地面处理：`ProcessGround.py` / `ProcessGroundWorld.py`。
