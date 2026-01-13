# 📜 Scratchpad - Current Context

## 🚧 Active Task: Moments (点滴) UI Refactor

> **Goal**: 将 Moments 页面从简单的列表升级为"高级感时间轴"。

### 🧠 Design Thoughts

- **Desktop**: 既然 Gallery 已经是 Bento Grid 和 瀑布流，Moments 应该做出差异化。**"非对称双侧时间轴"** 是个好主意，像一条蜿蜒的历史长河。
- **Data**: 之前的数据已经清空，现在页面是 Empty State。
- **Structure**:
  - 需要修改 `moments.css` 把 `.moment-card` 变成左右交替。
    - `nth-child(odd)` -> Left side
    - `nth-child(even)` -> Right side
  - 中心轴线 `.timeline-axis` 需要居中。

### 📋 Next Steps Checklist

1.  [ ] 修改 `moments.css`: 实现双侧布局 (Desktop)。
2.  [ ] 修改 `moments.css`: 优化 Mobile 端的脉冲轴线。
3.  [ ] 在 `moments_data.js` 里填入 **1 条真实的/合理的测试数据**（虽然用户叫删了测试数据，但开发时还是需要一条隐藏的或者 mock 数据的，不然看不出效果。或者我写代码时先用假数据渲染，最后再删掉）。

### ❓ Unresolved Questions

- 用户提到的"视频支持"什么时候做？-> Phase 2。
- 是否需要"按月筛选"的导航条？-> 内容多了再加，现在先做布局。
