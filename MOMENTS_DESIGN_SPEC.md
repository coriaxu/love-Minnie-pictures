# ✨ Minnie's Moments (点滴) · 设计规范与功能说明

> **"Love is not just looking at each other, it's looking in the same direction."**
> Moments 是关于生活碎片、美食、旅行和那些不经意间闪光的日常瞬间。

## 1. 核心设计理念 (Core Philosophy)

与主画廊 (Gallery) 的"艺术展"氛围不同，Moments 追求的是 **"私密日记 (Private Journal)"** 与 **"流动的时间 (Flowing Time)"** 感。

- **关键词**: 温暖、流动、碎片化、叙事性。
- **视觉隐喻**: 银河 (Milky Way) —— 每一个点滴并没有画作那么宏大，但聚集在一起就是璀璨的星河。
- **交互隐喻**: 抚摸时间轴 (Scrolling Timeline)。

---

## 2. 界面布局设计 (UI Layout)

### 2.1 桌面端 (Desktop)

采用 **"非对称双侧时间轴 (Asymmetrical Timeline)"** 布局。

- **中轴线**: 一条发光的丝线贯穿屏幕中央，代表时间流。
- **卡片分布**: 内容卡片交错分布在轴线左右两侧（左-右-左-右），打破单调感。
- **月度锚点**: 每个新月份开始时，轴线上会出现一个巨大的、发光的月份数字（如 _JAN_），作为视觉锚点。
- **视差背景**: 背景中的星尘或光斑随滚动产生轻微视差移动，增加深邃感。

**卡片样式 (The Capsule)**:

- 玻璃拟态 (Glassmorphism) 磨砂黑底。
- **多图拼贴**:
  - 1 张图：全宽 16:9 展示。
  - 2 张图：左右平铺。
  - 3 张图：左大右小（主次分明）。
  - 4+张图：2x2 网格，超过 4 张最后一张显示 "+N" 遮罩。
- **多媒体支持**: 支持嵌入短视频 (Live Photos 转换的 3 秒循环视频)。

### 2.2 移动端 (Mobile)

采用 **"单列脉冲时间轴 (Single Pulse Timeline)"** 布局。

- **轴线位置**: 位于屏幕左侧（约 15% 处）。
- **时间泡泡**: 日期（如 12 日）悬浮在轴线左侧，具体内容卡片在轴线右侧展开。
- **折叠/展开**: 对于长篇文字，默认收起，点击"展开全文"。

---

## 3. 功能特性 (Features)

### 3.1 核心功能 (Phase 1)

1.  **JSON 驱动渲染**: 继续使用 `moments_data.js` 作为数据源，保持轻量化。
2.  **智能图片网格**: 根据图片数量（1-9 张）自动选择最优的 CSS Grid 布局模板。
3.  **灯箱模式 (Lightbox 2.0)**:
    - 点击图片进入全屏大图浏览。
    - 支持手势左右滑动切换（Swipe to navigate）。
    - 支持双指缩放（Zoom）。
4.  **位置打卡 (Geo-Tag)**: 卡片底部显示位置（如 _Xi'an, China_），点击可（未来）跳转地图。

### 3.2 进阶规划 (Phase 2 - Planned)

1.  **视频/Live Photo 支持**: `<video>` 标签支持，静音自动播放，鼠标悬停播放声音。
2.  **心情天气**: 每条记录可附加一个小图标（🌤️ 🌧️ ❄️）和心情颜色（Border Color）。
3.  **时间筛选器**: 顶部增加按月份筛选的胶囊按钮，点击快速以此定位。

---

## 4. 技术实现规格 (Tech Specs)

### 4.1 数据结构 (`moment` object)

```javascript
{
    id: "uuid_string",
    date: "YYYY-MM-DD",
    type: "photo" | "video" | "note", // 新增类型区分
    title: "标题",
    content: "正文内容（支持简单HTML）",
    location: "地点名称",
    weather: "sunny", // 图标映射
    media: [
        { type: "image", src: "filename.jpg", width: 100, height: 100 },
        { type: "video", src: "clip.mp4", poster: "cover.jpg" }
    ],
    tags: ["food", "travel"]
}
```

### 4.2 关键样式

- **Scroll Reveal**: 使用 `IntersectionObserver` 实现卡片进入视口时的淡入上浮效果。
- **Sticky Month**: 滚动时，当前月份的标签（如 "January"）应吸附在屏幕顶部，直到下一个月份将其顶走。

---

## 5. 开发优先级 (Priority)

1.  **Refine UI**: 优化 CSS，实现更精致的玻璃态和时间轴细节（目前已有的 `moments.css` 为基础）。
2.  **Lightbox Interaction**: 完善灯箱的手势操作。
3.  **Data Population**: 录入第一批真实数据。

---

_Created by Ruogu for Love Minnie Project_
