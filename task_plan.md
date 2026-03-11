# 🎯 Task Plan: Love Minnie 图片库项目

## 📍 Current Focus: Moments (点滴) 升级

> 优先级调整：暂停年度回顾 (Year in Review) 开发，优先完善 Moments 页面的 UI 与功能。

- [ ] **M1. 视觉升级 (UI)**: 实施 `MOMENTS_DESIGN_SPEC.md` 中的设计规范。
  - [ ] 桌面端：非对称双侧时间轴布局。
  - [ ] 移动端：单列脉冲时间轴布局优化。
  - [ ] 视觉质感：优化玻璃拟态卡片与发光时间轴。
- [ ] **M2. 核心功能 (Features)**:
  - [ ] 数据结构升级：支持 `photos` (多图) 和未来的 `video` 字段。
  - [ ] 智能网格系统：实现用于 1-9 张图的 CSS Grid 布局。
  - [ ] Lightbox 2.0：支持手势滑动切换大图。

## 📝 Backlog: Year in Review (年度回顾)

> 代号 "The Masterpiece" - 2026 年底发布

- [ ] **R1. 交互逻辑**: 实现九宫格点击换图 (Photo Picker) 功能。
- [ ] **R2. 渲染输出**: 调试 html2canvas 生成 16:9 高清海报。
- [ ] **R3. 倒计时逻辑**: 完善 12 月 31 日 自动触发机制。

## 📅 Milestone: 6000 Days Anniversary

> Target Date: 2026-05-14 (Thursday)

- [ ] **Celebration Feature**: 6000 天纪念日网站庆祝活动 (具体方案待定)。
  - [ ] 策划具体庆祝形式（着陆页特效、彩蛋或专属页面）。
  - [ ] 开发与部署。

## ✅ Completed Tasks

- [x] **导航栏修复**: 修复了 Gallery 页面顶部 MOMENTS 与季节按钮重叠的问题 (2026-01-13)。
- [x] **年度回顾骨架**: 完成了 `year-review.js` 和 CSS 基础，实现了 Bento Grid 布局。
- [x] **移动端适配**: 完成了 Gallery 的瀑布流布局和移动端底部导航。
- [x] **自动化部署**: GitHub Actions + Zeabur 自动部署流程通畅。
- [x] **详情弹窗裁切修复**: 修复了桌面端影院模式下部分图片底部偶发被胶卷条遮挡的问题，同时补强了缓存图片的方向识别逻辑 (2026-03-10)。

## 📊 Project Status

- **Version**: v8.1
- **Tech Stack**: Vanilla HTML/CSS/JS (No Frameworks)
- **Design System**: "Starry Night" (Dark Mode + Glassmorphism + Glow)
