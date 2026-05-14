# 💡 Findings & Technical Decisions

> 这里记录项目开发过程中的关键技术决策、坑点排查和复用模式。

## 🎨 Design System: "Starry Night" (星夜)

- **核心配色**: 深蓝/紫渐变背景 (`#0a0514` ~ `#241734`) 配合暖色高光 (`#ffd700`, `#ff8cc6`)。
- **字体方案**:
  - 英文标题: `Bodoni Moda` (Classic, Elegant)
  - 中文手写: `LXGW WenKai Screen` (霞鹜文楷) - 营造私人书信感
  - 正文/UI: `Inter`
- **玻璃拟态**: `backdrop-filter: blur(20px)` + 半透明白边框，用于所有卡片和面板。
- **动态光效**: 使用 `box-shadow` 和 `mix-blend-mode: overlay` 模拟体积光（Volumetric Lighting）。

## 🛠 Engineering Patterns

### 4. 6000 天纪念页的半自动电影模式（2026-05-13）

- **问题**: 只靠“星空 / 主页变形 / 信封情书”三个显式按钮，熊老婆正常打开时可能不会主动点到情书。
- **处理**: 星空和主页继续自动播放，Stage 2 额外给信封一个短提示文案，并在未点击时自动展开情书，保留一点亲手打开的仪式感。
- **存档**: 2026-05-15 起，首页右上角保留 `6000 Days` 按钮，作为 6000 天纪念页的回看入口。
- **可复用经验**: 当纪念页的核心内容依赖用户主动点开时，优先设计“自动播放 + 有限等待 + 自动兜底”，不要把关键内容放在纯探索式按钮里。

### 1. 导航栏布局防撞指南 (2026-01-13)

- **问题**: `display: flex` 的导航栏在窄屏下，中间的月份导航 (Month Nav) 会挤压右侧的季节按钮/Icon。
- **解决方案**: 使用 **绝对定位解耦**。
  - `.month-nav` 保持 `position: absolute; left: 50%; transform: translateX(-50%)`，确保永远居中。
  - 右侧功能区 `.header-actions` 单独定位。
  - **关键点**: 为右侧元素预留足够的 `right` 值（如 `240px`），防止文本较长时（如 "MOMENTS"）发生重叠。

### 2. 图片处理工作流

- **Raw -> Web**: 使用 `update_gallery.py` (Python Pillow) 自动将 `raw_images` 中的大图压缩转换为 WebP 格式并生成缩略图。
- **命名规范**: `YYYYMMDD.ext`，脚本自动解析日期。

### 3. 数据驱动 (No-Backend)

- 使用 `window.__GALLERY_DATA__` (JSON Array) 存储元数据。
- 优点：零后端成本，GitHub Pages 友好。
- 缺点：每次更新需 Commit 代码（但这通过 Python 脚本自动化了）。

## 🐛 Known Pitfalls

- **html2canvas**: 在已有 `backdrop-filter` 的元素上截图可能会失效或变黑。解决方案：生成截图时暂时移除玻璃态滤镜，或使用纯色背景替代。
- **Safari iOS**: `100vh` 问题，建议使用 `dvh` (Dynamic Viewport Height) 或 JS 修正。

### 🔥 Gallery 详情弹窗底部偶发裁切 (2026-03-10)

#### 现象

部分图片进入 Gallery 详情弹窗后，下沿看起来像被裁掉了一截，但另一些图片又完全正常。用户提供的案例图 `20260310.webp` 分辨率为 `1536 x 1024`，属于 3:2 比例。

#### 根本原因

这不是源图片损坏，也不是 `object-fit: cover` 在偷裁图，而是两个条件叠加后形成的视觉问题：

1. **影院模式底部胶卷条占高，但弹窗安全区预留不够严谨**
   - `body.modal-open .timeline-strip` 出现后会占据底部约 `100px` 高度。
   - 原样式通过给 `.detail-dialog` 直接写 `height: calc(90vh - 100px)` 和 `margin-bottom: 90px` 来“手工让位”。
   - 这种写法在某些视口高度和图片比例组合下，会让可视图片区刚好贴边，3:2 这种比 16:9 更高一点的横图更容易出现“底边被吃掉”的体感。

2. **图片方向识别绑定时机偏后，缓存命中时可能错过布局切换**
   - 原逻辑先给 `detailImage.src` 赋值，再挂 `onload`。
   - 如果浏览器直接命中缓存，`load` 事件可能已经过去，`is-portrait / is-landscape` 类的切换就不稳定，导致布局状态偶发失真。

#### 修复方案

- 在桌面端影院模式下，改为给 `.detail-modal` 明确增加底部安全区，并把 `.detail-dialog` 高度限制在 `100vh - 胶卷条 - 外边距` 的可视范围内。
- 让 `.detail-media img` 直接使用 `width: 100%; height: 100%; object-fit: contain;`，使图片始终在完整盒子内适配。
- 将方向识别改为“先绑定 `onload`，再切换 `src`”，并对 `detailImage.complete` 做兜底处理。

#### 可复用经验

1. **带悬浮底栏的沉浸式弹窗，不要只缩容器高度，也要同步处理容器外层安全区。**
2. **凡是依赖图片 `naturalWidth / naturalHeight` 做布局判断的逻辑，都要考虑缓存命中的同步路径。**
3. **当用户说“有些图有问题，有些图没问题”时，优先排查宽高比分布，而不是先怀疑图片文件本身。**

---

### 🔥 一键发布发送失败 (2026-04-02)

#### 现象

双击 `🚀_一键发布.command` 后，解压步骤通常正常，但流程经常卡在发送到 GitHub 这一步，表现为“有时能发，有时完全发不出去”。

#### 根本原因

问题不在 ZIP 包，也不在仓库权限，而在脚本把本机代理出口写死成了 `127.0.0.1:33210`：

1. 旧脚本启动时强制设置 `https_proxy / http_proxy / all_proxy`
2. 只要本机没有在 `33210` 监听，Git 就会被导向一个不存在的出口
3. 当前电脑环境下，该端口并未监听；同样的 `git push` 在不带这个代理设置时可以正常完成

这就造成了一个典型的“脚本比真实网络更脆弱”的问题：明明直连能发，脚本反而先把自己锁死了。

#### 修复方案

- 删除脚本里写死的代理设置
- 发送时先尝试直连 GitHub
- 只有直连失败时，才自动探测本机常见代理端口并重试
- 补上两类边界处理：
  - ZIP 解压后没有新文件变化
  - 当前没有新文件变化，但仓库里仍有待发送提交
- 将失败提示改得更直接，让用户能分辨是“直连失败”还是“代理失败”

#### 可复用经验

1. **本机网络脚本优先相信现场环境，不要预设唯一出口。**
2. **自动化脚本要单独处理“没有新改动”和“还有未发送提交”这两件事，它们不是同一个状态。**
3. **遇到“命令行能发、脚本发不出去”的情况，优先检查脚本里是否偷偷改了代理或环境变量。**

---

### 🔥 一键发布脚本缺少运行权限 (2026-04-08)

#### 现象

双击 `🚀_一键发布.command` 后，终端窗口很快退出，并弹出 “A session ended very soon after starting”。终端里真正关键的提示是 `permission denied`。

#### 根本原因

脚本内容没有损坏，GitHub 和下载包也不是根因。问题是文件权限变成了 `-rw-------`，macOS 没有把它当成可以直接运行的文件，所以双击后系统直接拒绝执行。

这类问题可能来自 Google Drive 同步、文件复制、重新下载或权限丢失。因为 `.command` 文件依赖运行权限，一旦这个权限消失，后面的解压、提交和发送流程都不会开始。

#### 修复方案

- 给 `🚀_一键发布.command` 恢复可运行权限。
- 修复后权限为 `-rwx------`。
- 用 `bash -n ./🚀_一键发布.command` 做脚本检查，确认脚本本身没有语法问题。
- 确认下载目录里存在当天发布包 `love-minnie-gallery-2026-04-08.zip`。
- 本次没有直接执行发布，避免在排查权限问题时误改线上内容。

#### 可复用经验

1. **看到 `permission denied` 时，先检查文件权限，不要先怀疑 GitHub、VPN 或脚本逻辑。**
2. **`.command` 文件能不能双击运行，取决于它是否有可运行权限。**
3. **如果终端弹出 “session ended very soon”，要回看窗口里最早出现的报错，那一行通常才是根因。**

---

### 🔥 一键发布脚本权限再次掉失 (2026-04-22)

#### 现象

用户再次双击 `🚀_一键发布.command` 时，Terminal 依旧会立刻结束，并弹出 “A session ended very soon after starting”。窗口里的关键报错仍然是 `permission denied`。

#### 根本原因

这次复发说明问题不在脚本正文，也不在 GitHub 推送逻辑。排查结果更具体：

1. 仓库里记录的脚本模式仍然是可运行状态
2. 本地文件权限却掉回了不可运行状态
3. 因为 `.command` 文件依赖执行权限，macOS 在双击入口处就直接拒绝了

这意味着真正会漂移的是本机文件系统权限，而不是仓库里的脚本内容。只要本地执行位丢了，用户看到的表象就会和 2026-04-08 那次一模一样。

#### 修复方案

- 恢复 `🚀_一键发布.command` 的执行权限为 `-rwxr-xr-x`
- 用 `bash -n` 再做一次脚本语法检查，确认脚本正文无误
- 把这次复发记录补进 `README.md`
- 将 README 更新提交并推送到 GitHub `main`，便于以后直接按项目文档排查

#### 可复用经验

1. **同样看到 `permission denied`，优先判断“是本地权限掉了”，不要重复怀疑脚本逻辑。**
2. **仓库里记成可运行，不代表当前电脑上的这份文件一定还可运行。**
3. **这类问题适合写进项目 README，因为它属于使用入口故障，不只是开发期技术细节。**

---

### 🔥 一键发布脚本卡在保存阶段 (2026-04-25)

#### 现象

双击 `🚀_一键发布.command` 后，脚本可以找到当天发布包 `love-minnie-gallery-2026-04-25.zip`，但长时间停在保存或发送前。命令行里单独跑 `git status`、`git update-index --refresh` 也会长时间无响应。

#### 根本原因

这次不是 GitHub、VPN 或账号认证问题，而是项目放在 Google Drive 里，部分旧图片文件会在读取时变慢。旧脚本用 `git add .` 检查整个项目文件夹，Git 会逐个检查历史图片文件；即使今天只新增一张图，也可能被旧图片的云盘按需读取拖住。

排查时定位到 `images/20260214.webp` 这类旧图片读取明显偏慢，说明故障点在本地云盘文件读取，而不是远端发送。

#### 修复方案

- `🚀_一键发布.command` 改为只处理本次 ZIP 包中的文件。
- 使用临时索引生成提交，避免 `git add .` 扫描整个项目目录。
- 保留原有直连 GitHub、失败后尝试本机代理的发送逻辑。
- 恢复脚本执行权限为 `-rwxr-xr-x`。
- 已把 2026-04-25 图片、数据文件、脚本修复和 README 记录提交并推送到 GitHub `main`，提交为 `06dac22`。

#### 可复用经验

1. **Google Drive 里的 Git 项目，发布脚本要避免全目录扫描。**
2. **日常图片发布只应处理 ZIP 包内文件，不应顺手检查全部历史图片。**
3. **如果脚本能找到 ZIP 但卡在保存阶段，优先检查是否触发了全项目 Git 检查。**

---

### 🔥 后续可由小萌直接发布图片 (2026-04-27)

#### 适用场景

徐老师后续可以直接发送图片原文件、日期和悄悄话，由小萌在项目文件夹内完成发布，不必再手动走 `📸_上传图片(admin).html` 生成 ZIP，也不必手动双击 `🚀_一键发布.command`。

#### 执行方式

发布流程默认走终端命令行：处理图片为网站需要的 WebP，更新 `data.json`、`data.js`、`js/data.js`，再用 Git 提交并推送到 GitHub。GitHub Pages 会在推送后自动更新。

#### 工具边界

浏览器插件适合点网页、看页面效果、截图验证；Computer Use 适合操作 Finder、Terminal、Chrome 等桌面 App。Love Minnie 的日常发布本质是文件处理和 Git 发布，所以命令行最直接。

#### 输入格式

最少需要三项：图片原文件、日期、悄悄话。如果图片只是微信预览、网页里的图或截图，需要先保存为本机文件，或直接作为附件提供。

---

### 🔥 图片上传"假成功"Bug (2026-01-27)

#### 现象

使用 admin.html 上传图片时，页面显示"成功！下载已开始"，但 GitHub 网站上并未显示新上传的内容。更隐蔽的问题是：**中间几天的图片数据会莫名其妙消失**。

#### 根本原因

项目中存在**两个 `data.js` 文件**，但 ZIP 生成逻辑只更新其中一个：

| 文件路径 | 用途 | ZIP 更新状态 |
|---------|------|-------------|
| `data.js` (根目录) | 网站展示用 | ✅ 会被更新 |
| `js/data.js` | admin.html 读取的源数据 | ❌ **不会被更新** |

**问题链路**：

1. admin.html 加载 `<script src="js/data.js">` 读取现有数据
2. 用户生成新 ZIP 时，代码基于 `window.__GALLERY_DATA__`（来自 `js/data.js`）创建新数据
3. ZIP 包内只包含根目录的 `data.js`，**不包含 `js/data.js`**
4. 一键发布脚本解压后，根目录 `data.js` 更新，但 `js/data.js` 保持旧版本
5. 下次用户再次操作时，admin.html 读取的还是**过期的 `js/data.js`**
6. 新生成的数据只包含"旧数据 + 新日期"，中间几天的数据就这样被覆盖丢失

#### 修复方案

**修改 `js/admin.js` 第 265-267 行**，让 ZIP 生成时同时创建 `js/data.js`：

```javascript
// 修复前
zip.file('data.json', JSON.stringify(newHistory, null, 4));
zip.file('data.js', `window.__GALLERY_DATA__ = ${JSON.stringify(newHistory)};`);

// 修复后
zip.file('data.json', JSON.stringify(newHistory, null, 4));
zip.file('data.js', `window.__GALLERY_DATA__ = ${JSON.stringify(newHistory)};`);
// 同时更新 js/data.js，确保 admin 读取的是最新数据
zip.file('js/data.js', `window.__GALLERY_DATA__ = ${JSON.stringify(newHistory)};`);
```

#### 经验教训

1. **单一数据源原则**：不应该存在两个需要手动同步的 `data.js` 文件。理想方案是让 admin.html 直接读取根目录的 `data.js`，或者统一为一个文件。
2. **"成功"的误导性**：当前的"上传成功"只是"ZIP 生成成功"，真正上传到 GitHub 还需用户手动操作。UI 提示应该更明确，说明这只是第一步。
3. **数据备份**：Git 历史救了丢失的数据。定期 push 到远端是很重要的习惯。

## 🚀 Deployment

- **GitHub Pages**: 静态托管。
- **Zeabur**: 自动同步部署。

---

### 🔧 6000 天纪念日特效开发踩坑笔记 (2026-05-07 ~ 2026-05-10)

#### 🐛 `mix-blend-mode: screen` + `opacity: 0` 隐藏不彻底 (2026-05-07)

**现象**：`.ambient-light` 设置 `opacity: 0` + transition 后，截图里仍有玫瑰星云的辐射光透出。

**原因**：`mix-blend-mode: screen` 元素即使 `opacity: 0` 也仍参与合成层（GPU 路径），在某些浏览器/截图压缩下产生残留辉光。

**修复**：用 `display: none !important` 而不是 `opacity: 0`。粒子层（`cursor-torch`）没有 blend mode 用 `opacity: 0` 是 OK 的。

#### 🐛 `mix-blend-mode` + Canvas 同 stacking context 渲染异常 (2026-05-07)

**现象**：`#d6k-number` 设 `mix-blend-mode: screen` 跟同 stacking context 的兄弟 `<canvas>` 共存时，数字会变得几乎不可见（实际 opacity=1 但 GPU 合成出 alpha ≈ 0）。

**修复**：深色纯背景上不需要 mix-blend-mode（直接 `color: #E8EEFF` 就够清晰），移除即可。原 hero 用 mix-blend-mode 是为了跟玫瑰星云的复杂背景做玉石光泽，纯色底用不到。

#### 🐛 Sleep 计时不能从浮现 transition 开始算 (2026-05-07)

**现象**：要让数字"完全可见 4.5 秒"，结果用户感受只有 1-2 秒。

**原因**：`number.classList.add('is-visible')` 触发 CSS opacity transition (2s)，立刻 `await sleep(4500)` 是从 transition **开始**算的。前 2 秒数字还在浮现，真正完全可见的时间只有 4.5 - 2 = 2.5 秒。

**修复**：`await sleep(800)` (副标题错峰) + `await sleep(1200)` (等浮现完成) + `await sleep(4500)` (真正驻留)。

#### 🎨 Canvas DPR 缩放正确做法 (2026-05-07)

```js
// ❌ 错：先 scale 又重置 width/height，scale 失效
ctx.scale(dpr, dpr);
canvas.width = w * dpr;

// ✅ 对：先 setTransform reset，再 scale
canvas.width = w * dpr;
canvas.height = h * dpr;
ctx.setTransform(1, 0, 0, 1, 0, 0);
ctx.scale(dpr, dpr);
// 后续渲染用逻辑像素（window.innerWidth/innerHeight），不用物理像素
```

#### 🛠️ 浏览器后台 RAF 节流 (2026-05-07)

Claude Preview MCP 的预览面板**不在前台焦点**时，`requestAnimationFrame` 被浏览器节流（每秒可能只跑 1 帧），导致依赖 RAF 的渐进绘制（如 6000 颗星 3s 绘制）实际跑了几十秒。

**应对**：preview 自验只能验视觉静态，时序验证用 `setTimeout` polling 配合 `performance.now()` 跟踪。生产环境用户主动浏览器没这问题。

#### 🔁 资源缓存破坏 (2026-05-07 起多次)

每次改 `js/day-6000.js` 或 `css/day-6000.css` 后，**必须 bump `index.html` 里的 `?v=N` 版本号**——浏览器对 query string 不变的同 URL 资源仍然会用 cache，改动看不出来。当前版本 v=10.8。

#### ⚠️ 多 AI 并行写同一项目，主项目 vs worktree 分叉 (2026-05-10)

**现象**：5-7 我（正言）在 worktree（`hungry-allen-225b7d` 分支）做了 day-6000 完整实现并 save-memory。5-10 上午小萌（Codex）跳过 worktree，**直接在主项目 main 分支**改了 day-6000.js / css，添加 memory-ribbon 等功能。下午我以为还在 worktree 工作，徐老师"刷新看不到改动"——实际本地 5177 server 跑在主项目目录，浏览器显示的是小萌版本，我改的是 worktree 版本。

**根本原因**：多 AI 协作没有约定"在哪条分支工作"。worktree 设计上是隔离工作流，但小萌没用 worktree 而是直接在 main 分支干活。两条线代码同时演进、没合并，导致一方的改动另一方看不到。

**修复策略**：
1. 立即停掉错方向的工作流（worktree v=8 修复抛弃）
2. 以"用户实际看到的版本"为基础（这里是主项目 main 分支）
3. 所有后续改动统一在主项目 main 分支
4. 项目记忆同步到主项目（之前 worktree 上的 task_plan/findings 改动需要搬过来）

**长期改进**：在多 AI 协作的项目根放一个 `AGENTS.md`（或类似），明确约定"统一在 main 分支干活、不开 worktree"——这次没有这个文件，所以分叉了。

#### 🐛 absolute 定位元素跟 flex 流元素的间距控制 (2026-05-10)

**现象**：`.d6k-memory-ribbon` 用 `position: absolute; bottom: clamp(72px, 10vh, 104px)` 定位在视口底部，nav 在 `.d6k-center` 的 flex justify-center 中段。视觉上 nav 跟 ribbon 之间的间距随视口高度变化——视口高时间距大，视口低时 ribbon 反而骑在 nav 上方。

**初次错修 v=10.5**：以为 ribbon 太靠下、加大 `bottom` 把它推得更高（72→180），结果 ribbon 离视口底部更远反而靠近视口中段，跟 nav 间距更小（最差 12px）。

**真正修复 v=10.6**：把 ribbon 从 absolute 释放为 flex 流——JS 把 ribbon 元素从 overlay 根（`.d6k-center` 的兄弟）移到 `.d6k-center` 内 `.d6k-nav` 之后，CSS 改 `position: relative`、删 `bottom`、用 `margin-top: clamp(40px, 6vh, 72px)` 显式控制间距。4 处 media query 同步改成 margin-top。

**教训**：**当一个元素跟另一个元素需要"距离恒定"时，让它们在同一个 flex 流里用 margin 控间距，远比 absolute 各自定位 + 算 bottom 数值靠谱**。absolute 定位的距离参考点是视口/父容器，flex 流元素的位置参考点是兄弟元素——两套坐标系混用就是分裂的灾难。

#### 🛠️ Claude Preview MCP 跨 origin 限制 (2026-05-10)

**场景**：之前 `.claude/launch.json` 配置在 worktree（cwd 指向 worktree），preview 起在 8766 端口。本次切到主项目工作流后，想让 preview 跳到主项目 5177 端口。

**尝试**：`preview_eval` 跑 `window.location.href = 'http://localhost:5177/...'` —— 失败，跳转后 URL 仍显示 8766。preview MCP 的连接绑定到原 origin 的特定 page，跨 origin 跳转后连接断，eval 走原 page。

**应对**：本次改用 Node 命令行跑天文公式自验（不依赖 preview）。或者：在主项目目录建另一份 `.claude/launch.json`、停旧 preview 再 start 新的——但 preview MCP 似乎只支持单 server，复用现有 server，没生效。

**长期方案**：preview MCP 应该支持显式 stop / restart，或者支持多 server 并存。当前设计假设单项目单 server，对多项目并行场景不够友好。

---

### 🔥 首页改版方向：从图库转向情书档案馆 (2026-04-28)

#### 背景

徐老师重新审视 Love Minnie 首页设计，希望跳出当前“左侧日历 + 当月瀑布流 + 底部时间轴”的结构，尤其要同时考虑两个长期问题：未来可能有几百张图片，以及熊老婆主要通过手机观看。

#### 当前架构事实

- 图片按日期命名，存放在 `images/YYYYMMDD.webp`。
- 作品数据是扁平数组，核心字段为 `id`、`date`、`filename`、`loveLetter`。
- 数据同时写入 `data.json`、根目录 `data.js` 和 `js/data.js`。
- 2026-04-28 检查时已有 124 条作品记录、125 张 WebP 图片，总图片体积约 36MB。

#### 判断

首页不应继续强化“图库感”。几百张图片如果全部围绕首页展示，会让 Love Minnie 越来越像相册管理器，削弱“每天给 Minnie 一份心意”的感受。

更适合的方向是 Folded Love Letter：首页只负责今日图、今日文字、日期和编号；历史作品进入“信件归档”，按年份、月份和日期收纳。桌面端可以吸收 Memory Table 的陈列感，但信息结构应以“信件”而不是“图片流”为核心。

#### 手机端原则

手机端不要把桌面版缩小。更合适的是竖向情书体验：打开先看到今日图，再看到今日话，再提供上一封、下一封和月份归档入口。这样更符合熊老婆随手打开看一眼的场景。

#### 实现边界

数据层暂时不需要重做。改版重点应放在 `gallery.html`、`css/style.css`、`js/script.js` 的展示结构和交互方式。若进入开发，优先保证现有一键发布链路不受影响。

---

## 2026-05-11 · Stage 2/3 调优三条踩坑（v=11.x）

### 设计稿合成图当 background-image，必双影；blur 是最轻的解法

徐老师两次发"主页换成这张行不"都是 ChatGPT 或 Canva 生成的设计稿合成图——文字（6000 DAYS / FOR MY WIFE / 副标题 / nav）已经栅格化烤进图里。直接 `background-image: url()` 会跟 HTML 元素 1:1 重叠，造成严重双影。

我先后尝试了三个错方向：
1. **加重柔光遮罩**到 96% alpha 压顶——上半部确实压平了，但情侣剪影、夕阳一起被牺牲，效果像蒙了一层粉纸，没意义
2. **径向 + 线性 gradient 复合遮罩**——叠加层数越多越难调，每次改都得测，徒劳
3. **裁剪图片只保留底部光照区域**——尝试过 mask + background-position 配合，但烤字遍布全图没有干净的横条

最后落地方案：`filter: blur(7px) saturate(1.05) + transform: scale(1.04)`。三个细节缺一不可：
- `blur(7px)`：阈值经验值。低于 5px 烤字残影还在；高于 10px 情侣剪影也糊到不可识别
- `saturate(1.05)`：blur 后颜色会发灰，5% 饱和度补偿
- `scale(1.04)`：blur 滤镜在元素边缘会产生 ~7px 的透明虚边（blur 的高斯卷积特性），不放大就能看到容器边缘出现一圈奇怪的暗色

通用结论：**设计稿合成图永远不要直接当 background-image**。如果用户硬要给设计稿当背景，要么 blur 糊掉文字、要么砍 HTML 重复元素改成纯静态海报、要么向用户要原始无文字版。

### CSS 半透明背景 + z-index 层叠陷阱

Stage 3 信封展开后，徐老师反馈"星空看不见了"。截图显示信纸两侧只有零星几颗暗星和模糊的猎户连线，跟预期的"那夜冬夜星空"差距巨大。

层级链路：
- `#d6k-letter-overlay`（position: fixed, z-index: 9800）自身 `background-color: rgba(4, 8, 22, 0.94)` —— 94% 不透明深空蓝
- 子元素 `#d6k-historical-sky` canvas（z-index: -1, opacity: 0.55）

bug：canvas 的 z-index: -1 让它在父元素层叠上下文里位于"背景之上、其他子元素之下"，但父元素背景 0.94 alpha 的暗色直接把 canvas 的 55% opacity 内容压成几乎不可见。

修复：
- 父元素背景改 `transparent`
- canvas opacity 提到 1.0（canvas 自己已经画了 `#0a0518 → #06030f` 的实色渐变夜空底，完全可以独立当背景）

通用结论：**当一个元素打算用 canvas / 子元素当视觉主体时，父容器不要自带半透明背景色**——它会跟子元素叠加成意料之外的灰度。让 canvas / 子元素自己负责所有视觉，父容器只做 layout 容器。

### opacity 影响子元素，半透明容器要用 background rgba

徐老师追问"那情书正后面的星空咋办呢"——信纸不透明米色把正后方星空挡死了。

第一反应是给 `#d6k-letter` 加 `opacity: 0.84`。但 opacity 会传递给所有子元素：每行情书文字 `<p>` 也会变 84% 不透明，文字会被星空"吃掉"对比度，难读。

正确做法：保持 `opacity: 1`，把 `background` 改成 `rgba(244, 228, 193, 0.84)` 形式。这样：
- 容器背景半透明（星空透出）
- 文字 `<p>` 完全不透明（清晰可读）

再叠 `backdrop-filter: blur(3px) saturate(1.08)`，把信纸正后方的星点轻微模糊，避免锐利星点干扰文字阅读。

通用结论：**容器半透明 + 子元素不透明的需求，必须用 `background: rgba(...)`，绝对不能用 `opacity` 属性**。opacity 是节点级整体透明度（包括所有子节点），background-color 是仅作用于背景的颜色 alpha。这是 CSS 入门级陷阱，但每次想"快速半透明"时还是容易踩。
