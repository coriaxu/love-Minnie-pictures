# AGENTS.md · Love Minnie Pictures 多 AI 协作约定

> 本文件给所有进入这个项目工作的 AI 看（正言/小萌/若谷）。`CLAUDE.md` 内容与本文件完全一致——改一份必须同步另一份。

## 项目是什么

Love Minnie Pictures 🌻——徐老师送给熊老婆的"星空下的向日葵画廊"。Vanilla HTML/CSS/JS（无框架）的纯静态网站，每日上画 + 瀑布流画廊 + 影院模式 + 自动季节切换。设计系统代号 **Starry Night**（深紫底 + 玫瑰星云 + 玻璃拟态）。

部署：GitHub Pages + Zeabur 自动同步。

---

## 多 AI 协作硬约定（重要）

### 1. 统一在 main 分支工作，不要开 worktree

**历史教训**：2026-05-07 正言开了 worktree `hungry-allen-225b7d` 做 6000 天纪念日开发，2026-05-10 小萌跳过 worktree 直接在 main 分支扩展，两条线分叉，下午正言花了一小时才发现"刷新看不到改动"是因为 server 跑在主项目而我在改 worktree。

**约定**：所有 AI 一律在主项目目录（`/Users/surfin/.../love Minnie 图片库项目/`）的 main 分支工作。不用 git worktree。

### 2. 改文件前先 `git status` 看是否有其他 AI 未提交改动

如果看到 `M` 标记的文件不是你这次要改的，先看它是不是别的 AI 留下的未提交改动。**不要 `git checkout` 撤销别人的工作**。如果改动跟你要做的事冲突，先在对话里跟徐老师确认。

### 3. 项目记忆位置（旧版根目录兼容模式）

不在 `AI_专属/` 子目录，而是直接散在项目根：
- `task_plan.md` —— 进度、阶段、待办、下一步
- `findings.md` —— 方法论、洞察、踩坑笔记
- `scratchpad.md` —— 草稿、半成品思路
- 没有 `decisions.md` / `memory_map.md`（按需建）

写入时遵守 save-memory skill 规则：施工日志先写（双写 Google Drive + 本地镜像），项目记忆按主题分流写入。

### 4. 改 day-6000.* 后必须 bump `index.html` 里的 `?v=N` 版本号

`index.html` 末尾用 `<script src="js/day-6000.js?v=11.9">` 这种 query string 控缓存。**每次改 day-6000.js / day-6000.css 后必须把 `?v=N` 加 1**（当前 v=11.9）。否则浏览器会用 cache，徐老师"刷新看不到改动"。

### 5. 本地预览

```bash
cd "/Users/surfin/.../love Minnie 图片库项目"
python3 -m http.server 5177
```

访问：`http://127.0.0.1:5177/?d6k=1&d6kDev=1`

URL 参数说明：
- `?d6k=1` —— 强制触发 6000 天 day-6000.js 完整三阶段；正式当天会自动串联星空、主页和情书，Stage 2 的信封提示会在未点击时自动兜底展开
- `?d6k=stage1` / `stage2` / `stage3` —— 跳到对应阶段
- `?d6kDev=1` —— 显示开发预览浮条（默认隐藏）

---

## 当前里程碑（2026-05-14 6000 天纪念日）

截至 2026-05-13 已进入最后预演。详细子任务清单见 `task_plan.md` 的「📅 Milestone: 6000 Days Anniversary」段落。

**关键文件**：
- `js/day-6000.js` —— 6000 天叙事引擎（约 1110 行：3 阶段叙事 + 32 颗冬夜星表 + 球面三角公式 + 信封情书 + 画卷 + 信纸开关 ✦/✉ + 半自动情书兜底）
- `css/day-6000.css` —— 配套样式（夕阳玫瑰金 Stage 2 + 半透明信纸 backdrop-filter + 历史星图独立背景层 + 信封提示气泡）
- `js/anniversary-effects.js` —— 全局纪念日触发器（扩展支持 `once: 'YYYY-MM-DD'` 字段）
- `index.html` —— 主页 + day-6000 资源接入 + Google Fonts (Playfair Display / Pinyon Script / Cinzel) + 版本号
- `docs/ANNIVERSARY_EFFECTS.md` —— 设计规范文档
- `assets/music/kepler.mp3` —— 配乐位置（**待用户放孙燕姿《克卜勒》**）
- `assets/day-6000-bg.jpg` —— Stage 2 背景图：已用 ChatGPT 生成的设计稿合成图（1672×941 JPEG），通过 `filter: blur(7px) saturate(1.05) + transform: scale(1.04)` 把图里烤进去的文字糊成色块，保留情侣剪影 + 夕阳氛围作为印象派氛围底（v=11.2 确定）

**剩余 A 子任务**：A7 移动端 + reduced-motion、A8 5-13 晚预演、A9 部署 + 5-14 当日守候

---

## 用户称呼约定（徐老师全局规则的子集）

- **徐老师**：项目主人。日常称"徐老师"，本名是徐浩。署名场景才用"浩"。**不要凭空猜名字**（曾错猜过徐向鹏 / 徐向前）
- **熊老婆**：徐老师的妻子，本名 Minnie（孙燕姿真爱粉、HSP 高敏感人群）。日常称"熊老婆"

---

## AI 团队分工（仅供参考，不是硬约定）

- **正言**（Claude Code，前端美学）：UI/UX、动效、视觉打磨
- **小萌**（Codex，后端逻辑）：数据管线、算法、Python 脚本
- **若谷**（Gemini，全能大将）：流程规划、SOP、跨学科整合

实际谁先接到任务谁做，不严格分工。但**改完都要遵守上面的硬约定**。
