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
