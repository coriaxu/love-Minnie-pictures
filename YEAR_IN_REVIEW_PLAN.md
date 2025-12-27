# 🎁 Minnie 年度回顾 (Year in Review) · 产品与技术设计文档

> **版本 (Version)**: 1.0.0
> **代号 (Codename)**: The Masterpiece
> **负责人 (Owner)**: 若谷 (Antigravity)
> **目标 (Goal)**: 打造电影级视觉质感的年度回忆蒙太奇

---

## 1. 产品概述 (Product Overview)
我们不只是在做一张拼图，我们是在利用网页技术渲染一张**具有 Octane/UE5 级别光影质感**的艺术海报。这不是简单的图片排列，而是一次“信息的视觉化重构”。

### 核心体验流程
1.  **惊喜入口 (The Trigger)**
    *   在页面右下角悬浮一个**精致的 🎁 礼物按钮**（带有微光呼吸特效）。
    *   *逻辑设定*：默认隐藏，仅在每年 **12月31日** 出现（开发测试模式下强制开启）。
2.  **人机协作选片 (Collaborative Selection)**
    *   **系统初选**：算法自动从 1-12 月中各挑选一张高质量照片（基于图片尺寸或随机分布），填入“画廊”。
    *   **用户精修**：用户点击任意格子的照片，弹出“照片选择器”，可从图库中手动替换该照片。**“先由我（AI）铺底，再由您（徐老师）点睛”**。
3.  **渲染与生成 (Rendering)**
    *   点击“生成海报”按钮。
    *   系统利用 DOM 截图技术，将高清、经过 CSS 滤镜调色的界面转化为一张 **16:9** 的 JPEG/PNG 图片。
    *   自动触发下载，文件名为 `Minnie_Year_In_Review_2025.png`。

---

## 2. 视觉设计规范 (Visual Architecture)
*目标：在浏览器中实现“编辑级平面设计”与“体积光影”效果。*

### 2.1 画布规格
*   **比例**: 16:9 (Landscape)
*   **分辨率标准**: 1920x1080 (FHD) 或更高
*   **布局风格**: **Bento Grid (便当盒式)** —— 大小错落，主次分明，具有极其严谨的网格对齐。

### 2.2 视觉质感 (The "UE5/Octane" Look via CSS)
为了达到您要求的“虚幻引擎5级”质感，我们将使用高阶 CSS 技术模拟光影：
*   **体积光 (Volumetric Lighting)**: 使用 `linear-gradient` 和 `mix-blend-mode: overlay` 在照片上叠加隐约的斜射光束，模拟丁达尔效应。
*   **锐利焦点 (Sharp Focus)**: 图片容器添加微小的 `box-shadow` 内阴影，增加层次感；图片本身应用 `filter: contrast(110%) brightness(105%)` 提升通透度。
*   **玻璃拟态 (Glassmorphism)**: 标题栏和信息模块使用 `backdrop-filter: blur(20px)` 配合高透白噪点纹理，打造磨砂玻璃的高级质感。
*   **专业调色 (Color Grading)**:
    *   为所有照片叠加一层极淡的统一色罩（如温暖的琥珀色或电影感的青橙色），确保不同光线下的照片在一起和谐共存。

---

## 3. 技术实现方案 (Technical Implementation)

### 3.1 目录结构
我们将新增以下文件，保持项目整洁：
```text
/
├── review.html      # 年度回顾独立页面
├── css/
│   └── review.css   # 专门的电影级样式表
└── js/
    └── review.js    # 选片逻辑与生成逻辑
```

### 3.2 关键依赖
*   **html2canvas**: 用于将 HTML 节点无损转换为 Canvas 并导出图片。
    *   *CDN*: `https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js`

### 3.3 数据逻辑
*   **照片来源**: 复用现有的 `gallery-data.js` (或者 `script.js` 中的图片数组)。
*   **时间过滤**: 模拟将现有照片分配到 12 个月（如果照片没有真实日期元数据，我们将模拟分配或随机分配用于演示）。

---

## 4. 开发路线图 (Roadmap)
1.  **Phase 1: 骨架搭建** - 创建 16:9 响应式画框，确立 Bento Grid 布局。
2.  **Phase 2: 光影渲染** - 编写 CSS 分层样式，实现“体积光”和“玻璃态”。
3.  **Phase 3: 交互逻辑** - 实现 🎁 按钮入口，以及点击格子的换图功能。
4.  **Phase 4: 合成输出** - 集成 `html2canvas`，调试下载功能。

---

徐老师，这份文档是否符合您对 **“Octane 渲染级海报”** 的想象？
如果确认无误，我将按照这个蓝图开始搭建地基！🏗️
