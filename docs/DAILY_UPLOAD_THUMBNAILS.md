# 日更 Skill 改造：上画时一起生成缩略图

> 给小萌：请据此修改 `love-minnie-daily-upload` Skill（`/Users/surfin/.agent/skills/love-minnie-daily-upload/`）。2026-10-22，正言。

## 为什么要加

2026-10-21 起，画历的圆窗、看画页底部的胶卷条、画历左栏"这个月的特别日子"改用 `images/thumbs/` 里的缩略图（短边 320px，每张几十 KB），画历一屏从约 6MB 降到 1.2MB。

新上的画如果没有缩略图，页面不会坏：这几处会自动退回原图，只是多花流量。所以这一步**不阻断发布**，但每次上画都应该带上。

## 要改的三处

**1. 生成：转好 WebP、写完数据之后，提交之前**

```bash
python3 tools/make_thumbs.py 2026-10-22
```

- 参数写这次上画的日期（`YYYY-MM-DD` 或 `YYYYMMDD` 都行）；一次发多天就把日期都写上，空格隔开。
- 排期发布、回填旧日期、重传替换某一天的画，都一样：传那一天的日期，会覆盖旧的缩略图。
- **一定要带日期**。不带日期会扫描整个 `images/`，项目在 Google Drive 里，全目录读取可能卡住（2026-04-25 的一键发布就是这样卡住的）。
- 成功时输出一行 `images/thumbs/20261022.webp  52.3 KB`，退出码 0。
- 找不到原图时退出码 1（`找不到原图：images/20261022.webp`）。这说明前面的 WebP 步骤有问题，按原有流程排查。

**2. 提交：把缩略图加进明确的文件清单**

```
images/thumbs/YYYYMMDD.webp
```

和 `images/YYYYMMDD.webp`、`data.json`、`data.js`、`js/data.js`、`gallery.html` 一起显式列出。不要 `git add images/thumbs/` 整个目录，也不要 `git add .`。

**3. 核验：推送后多查一个地址**

线上 `images/thumbs/YYYYMMDD.webp` 返回 200，和原图的核验放在一起。

## dry-run 阶段

- 检查 `tools/make_thumbs.py` 存在；不存在说明本地仓库还没更新到 2026-10-22 之后的 main，先 `git pull`。
- 在计划里列出"将生成 `images/thumbs/YYYYMMDD.webp`"。

## 出错时

缩略图生成失败（缺 Pillow、磁盘、Drive 读不到等）不阻断发布，照常提交原图和数据，但在给徐老师的汇报里写明"缩略图没生成，画历这一天暂用原图"，下次补上：

```bash
python3 tools/make_thumbs.py <那一天>
```

## 验收

改完跑一次 dry-run，再真实上画一次。上线后打开画廊的画历，用开发者工具确认当天那扇圆窗加载的是 `images/thumbs/YYYYMMDD.webp`，不是原图。
