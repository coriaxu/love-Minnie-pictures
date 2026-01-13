/**
 * Annual Moments Data Source
 * 存储「年度点滴」的时间轴数据
 */
const MOMENTS_DATA = [
    // 数据结构示例：
    // {
    //     id: "20260101_example",
    //     date: "2026-01-01",
    //     title: "示例标题",
    //     location: "Location",
    //     description: "描述文本...",
    //     photos: ["image1.jpg", "image2.jpg"],
    //     tags: ["标签"]
    // }
];

// 挂载到 window 对象以便全局访问
window.MOMENTS_DATA = MOMENTS_DATA;
