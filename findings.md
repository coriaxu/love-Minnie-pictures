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
