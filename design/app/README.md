# Love Minnie App · 设计稿

把画廊网页做成熊老婆手机（iPhone 13 Pro）上的 App，用 huashu-design v3.4.2 的流程出的三个方向初稿。还没选定，选定后再做正式版。

| 文件 | 内容 |
| --- | --- |
| `spec.md` | 三个方向共用的需求：App 比网页多出什么、受众、核心信息、格式 |
| `directions.md` | 六张方向卡，三张做了完整版，三张备选 |
| `design-demos/dir-1.html` | 方向一「撕日历」 |
| `design-demos/dir-2.html` | 方向二「一画一屏」 |
| `design-demos/dir-3.html` | 方向三「册页」 |
| `design-demos/shot-dir-*.jpg` | 三版展示板截图 |
| `polish-log.md` | 每版打磨看到的问题和改法 |
| `tools/build_data.py` | 从 `data.json` 生成原型用的 `_data.js`（平均色、主色、句子） |

每台手机都能点：锁屏点通知进 App，底部切换，撕开／翻页／浮卡，从往日进到某一天。

## 预览

```bash
python3 -m http.server 5177 --bind 127.0.0.1
```

打开 <http://127.0.0.1:5177/design/app/design-demos/dir-1.html>（dir-2、dir-3 同理）。直接双击 HTML 也能看，画和字体走仓库里的相对路径，不引外部 CDN。

上画之后想让原型里的往日跟着更新，重跑 `python3 design/app/tools/build_data.py`。
