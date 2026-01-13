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

## 🚀 Deployment

- **GitHub Pages**: 静态托管。
- **Zeabur**: 自动同步部署。
