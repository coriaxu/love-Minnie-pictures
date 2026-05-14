/**
 * Day 6000 · 6000 天纪念日叙事引擎
 *
 * 仅在 2026-05-14 当天由 anniversary-effects.js 触发。
 * 三阶段叙事：星空认出 → 主页变形 + 信封 → 信封展开（情书 + 画卷收束）。
 *
 * @see docs/ANNIVERSARY_EFFECTS.md → 「🌌 5月14日 —— 6000 天纪念日」
 */

(function () {
    'use strict';

    // ============================================================
    // 配置常量（徐老师在这里改文案与资源路径）
    // ============================================================

    // 情书正文：每个元素是一行；空字符串表示空行；以 ">>" 开头视为落款
    // 修改时直接改本数组即可（也可同步 docs/ANNIVERSARY_EFFECTS.md）
    const LETTER_LINES = [
        '熊老婆，',
        '',
        '6000 天前的今天，泉州。',
        '',
        '那天，我好像就认定了一件事：',
        '和你相爱，是我这一生很重要的事。',
        '',
        '只是后来才慢慢懂得，',
        '不是把日子过成什么样子给别人看，',
        '而是这么多年过去，',
        '每天醒来，我还是愿意把心交给同一个人。',
        '',
        '一顿饭，一次出门，一张图，',
        '一句“今天也爱你”，',
        '就这样慢慢变成了 6000 天。',
        '',
        '接下来的每一天，',
        '我还想继续把你认出来。',
        '',
        '认出那个一直在变、',
        '也一直让我心动的人。',
        '',
        '>>灰老公',
        '>>2026 年 5 月 14 日',
    ];

    // 资源路径（用户首次手势后才能播放）
    const AUDIO_SRC = '';   // 放入本地音频后再填写路径，避免缺素材时报错。

    // 6000 天起点（地理与时间锚点）
    const ORIGIN = {
        date: '2009-12-10T22:00:00+08:00',  // 泉州当地时间
        lat: 24.8741,                        // 泉州纬度
        lon: 118.6757,                       // 泉州经度
        cityCN: '泉州'
    };

    // 2009-12-10 22:00 泉州夜空：精选明亮恒星表（J2000 历元 RA 时, Dec 度, 视星等, 名）
    // 覆盖冬夜南方主导星座：猎户、大犬、小犬、金牛、御夫、双子、昴宿、英仙、仙后、仙女
    const HISTORIC_STARS = [
        // 猎户座
        { name: 'Rigel',      ra: 5.242, dec:  -8.202, mag:  0.13 },
        { name: 'Betelgeuse', ra: 5.919, dec:   7.407, mag:  0.45 },
        { name: 'Bellatrix',  ra: 5.418, dec:   6.350, mag:  1.64 },
        { name: 'Saiph',      ra: 5.796, dec:  -9.670, mag:  2.06 },
        { name: 'Mintaka',    ra: 5.534, dec:  -0.299, mag:  2.23 },
        { name: 'Alnilam',    ra: 5.604, dec:  -1.202, mag:  1.69 },
        { name: 'Alnitak',    ra: 5.679, dec:  -1.943, mag:  1.74 },
        // 大犬座
        { name: 'Sirius',     ra: 6.752, dec: -16.716, mag: -1.46 },
        { name: 'Adhara',     ra: 6.977, dec: -28.972, mag:  1.50 },
        { name: 'Wezen',      ra: 7.140, dec: -26.394, mag:  1.84 },
        { name: 'Mirzam',     ra: 6.378, dec: -17.956, mag:  1.98 },
        // 小犬座
        { name: 'Procyon',    ra: 7.655, dec:   5.225, mag:  0.34 },
        // 金牛座
        { name: 'Aldebaran',  ra: 4.598, dec:  16.509, mag:  0.85 },
        { name: 'Elnath',     ra: 5.438, dec:  28.608, mag:  1.65 },
        { name: 'Pleiades',   ra: 3.792, dec:  24.105, mag:  1.60 },  // 昴宿星团 M45
        // 御夫座
        { name: 'Capella',    ra: 5.278, dec:  45.998, mag:  0.08 },
        { name: 'Menkalinan', ra: 5.992, dec:  44.948, mag:  1.90 },
        // 双子座
        { name: 'Pollux',     ra: 7.755, dec:  28.026, mag:  1.14 },
        { name: 'Castor',     ra: 7.577, dec:  31.888, mag:  1.57 },
        { name: 'Alhena',     ra: 6.629, dec:  16.399, mag:  1.93 },
        // 南方低空（南船座、鲸鱼座）
        { name: 'Canopus',    ra: 6.399, dec: -52.696, mag: -0.74 },
        { name: 'Diphda',     ra: 0.726, dec: -17.987, mag:  2.04 },
        { name: 'Fomalhaut',  ra: 22.961,dec: -29.622, mag:  1.16 },
        // 英仙座
        { name: 'Algol',      ra: 3.136, dec:  40.956, mag:  2.12 },
        { name: 'Mirfak',     ra: 3.405, dec:  49.861, mag:  1.79 },
        // 仙后座
        { name: 'Schedar',    ra: 0.675, dec:  56.537, mag:  2.24 },
        { name: 'Caph',       ra: 0.153, dec:  59.150, mag:  2.27 },
        { name: 'Ruchbah',    ra: 1.430, dec:  60.235, mag:  2.66 },
        // 仙女座
        { name: 'Mirach',     ra: 1.162, dec:  35.621, mag:  2.07 },
        // 三角 / 白羊
        { name: 'Hamal',      ra: 2.119, dec:  23.462, mag:  2.00 },
        // 鲸鱼座
        { name: 'Menkar',     ra: 3.038, dec:   4.090, mag:  2.54 },
        // 飞马座
        { name: 'Markab',     ra: 23.080,dec:  15.205, mag:  2.49 },
    ];

    // 猎户座连线（这是冬夜最具辨识度的星座，画出来帮 Minnie 认出"那夜的天空"）
    const STAR_LINES = [
        // 腰带（参宿一二三）
        ['Mintaka', 'Alnilam'], ['Alnilam', 'Alnitak'],
        // 主体梯形（参宿四 ↔ 参宿五，参宿七 ↔ 参宿六）
        ['Bellatrix', 'Betelgeuse'],
        ['Bellatrix', 'Mintaka'],
        ['Betelgeuse', 'Alnitak'],
        ['Alnitak', 'Saiph'],
        ['Saiph', 'Rigel'],
        ['Rigel', 'Mintaka'],
    ];

    // "今天"那颗在最中心（i=0）；i 越大越早，向外辐射，光强递减。
    // 这样视觉上 6000 颗星从今天向 6000 天前的过去延展开。
    const TODAY_STAR_INDEX = 0;

    // 本次会话内信封是否已打开过（避免重复触发动效）
    let envelopeOpened = false;

    const forcePreviewDayCounter = () => {
        if (!new URLSearchParams(window.location.search).has('d6k')) return;
        const counter = document.getElementById('day-counter');
        const unwrap = document.getElementById('unwrap-btn');
        if (counter) counter.textContent = '6000';
        if (unwrap) unwrap.textContent = 'Unwrap Day 6000';
    };

    forcePreviewDayCounter();

    // 状态收纳
    const state = {
        anniversary: null,
        canvas: null,
        canvasCtx: null,
        starfield: null,
        audioEl: null,
        autoOpenTimer: null,
        cleanupFns: [],
    };

    // 主页原始内容缓存（用于 cleanup 还原）
    const heroOriginal = {
        hero: null,
        counter: null,
        btn: null,
    };

    // ============================================================
    // 工具函数
    // ============================================================

    const prefersReducedMotion = () =>
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    // 简易种子伪随机（用于历史星图暗背景星海的稳定分布）
    const mulberry32 = (seed) => {
        let t = seed;
        return () => {
            t |= 0; t = (t + 0x6D2B79F5) | 0;
            let r = Math.imul(t ^ (t >>> 15), 1 | t);
            r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
            return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
        };
    };

    // ============================================================
    // 天文计算（球面三角，足够还原 2009-12-10 22:00 泉州夜空）
    // ============================================================

    // 把 Date 转儒略日（Julian Day）
    const toJulianDay = (date) => {
        const y = date.getUTCFullYear();
        const m = date.getUTCMonth() + 1;
        const d = date.getUTCDate() +
                  (date.getUTCHours() + date.getUTCMinutes()/60 + date.getUTCSeconds()/3600) / 24;
        let Y = y, M = m;
        if (M <= 2) { Y -= 1; M += 12; }
        const A = Math.floor(Y / 100);
        const B = 2 - A + Math.floor(A / 4);
        return Math.floor(365.25 * (Y + 4716)) +
               Math.floor(30.6001 * (M + 1)) +
               d + B - 1524.5;
    };

    // 格林尼治平恒星时（小时），简化 IAU 1982 公式
    const greenwichSiderealTime = (jd) => {
        const T = (jd - 2451545.0) / 36525;
        let gst = 280.46061837 + 360.98564736629 * (jd - 2451545.0)
                + 0.000387933 * T * T - T * T * T / 38710000;
        gst = ((gst % 360) + 360) % 360;
        return gst / 15;
    };

    // 本地恒星时（小时）
    const localSiderealTime = (jd, lonDeg) => {
        return ((greenwichSiderealTime(jd) + lonDeg / 15) % 24 + 24) % 24;
    };

    // 赤道坐标 (RA, Dec) → 地平坐标 (Alt, Az)
    // 输入：RA 小时、Dec 度、纬度度、本地恒星时小时
    // 输出：仰角度（地平 0°，天顶 90°）、方位角度（北 0°，东 90°，南 180°，西 270°）
    const equatorialToAltAz = (raHours, decDeg, latDeg, lstHours) => {
        const ha = (lstHours - raHours) * 15;
        const haRad = ha * Math.PI / 180;
        const decRad = decDeg * Math.PI / 180;
        const latRad = latDeg * Math.PI / 180;
        const sinAlt = Math.sin(decRad) * Math.sin(latRad)
                     + Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad);
        const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
        const cosAz = (Math.sin(decRad) - Math.sin(alt) * Math.sin(latRad))
                    / (Math.cos(alt) * Math.cos(latRad) || 1e-9);
        let az = Math.acos(Math.max(-1, Math.min(1, cosAz)));
        if (Math.sin(haRad) > 0) az = 2 * Math.PI - az;
        return { altDeg: alt * 180 / Math.PI, azDeg: az * 180 / Math.PI };
    };

    const onCleanup = (fn) => state.cleanupFns.push(fn);

    // ============================================================
    // 阶段 1 · 星空认出 (Starfield Awakens)
    // 用 Canvas 在屏幕上铺开 6000 颗星（黄金角度螺旋分布）
    // ============================================================

    /**
     * 计算 6000 颗星的位置（黄金角度螺旋 / Vogel spiral）
     * 返回数组：每项 { x, y, r, brightness, isToday }
     * 坐标归一到 [-1, 1] 范围，渲染时再映射到屏幕
     */
    const computeStarfield = (count = 6000, todayIndex = TODAY_STAR_INDEX) => {
        const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ≈ 137.508°
        const stars = new Array(count);

        for (let i = 0; i < count; i++) {
            // 半径：sqrt 让密度均匀
            const radius = Math.sqrt(i / (count - 1));
            const theta = i * GOLDEN_ANGLE;
            const x = radius * Math.cos(theta);
            const y = radius * Math.sin(theta);

            // 亮度：今天那颗最亮（中心），向外辐射越远越暗（越早的天）
            const distFromToday = Math.abs(i - todayIndex) / count;
            let brightness;
            if (i === todayIndex) {
                brightness = 1.0;
            } else {
                // 距离今天越远越暗，但保持最低 0.32 让最外圈也能看见
                brightness = 0.32 + (1 - distFromToday) * 0.55;
            }

            const r = i === todayIndex ? 4.2 : (0.6 + (1 - distFromToday) * 1.6);

            stars[i] = { x, y, r, brightness, isToday: i === todayIndex };
        }

        return stars;
    };

    // 用逻辑像素绘制（setTransform 已经把 DPR 缩放挂上）
    const renderStarfield = (canvas, ctx, stars, scrollProgress = 1) => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const cx = w / 2;
        const cy = h / 2;
        const radius = Math.min(w, h) * 0.42;

        ctx.clearRect(0, 0, w, h);

        // 全局银河淡蓝叠加（冷色基调）
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.2);
        grad.addColorStop(0, 'rgba(180, 210, 255, 0.08)');
        grad.addColorStop(1, 'rgba(180, 210, 255, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // 渐进显示（scrollProgress 0→1 控制可见星数）
        const visibleCount = Math.floor(stars.length * scrollProgress);

        for (let i = 0; i < visibleCount; i++) {
            const s = stars[i];
            const px = cx + s.x * radius;
            const py = cy + s.y * radius;

            // 今天那颗：暖金白光晕（冷海里唯一的暖色焦点）
            if (s.isToday) {
                const aura = ctx.createRadialGradient(px, py, 0, px, py, 28);
                aura.addColorStop(0, 'rgba(255, 232, 176, 0.95)');
                aura.addColorStop(0.4, 'rgba(255, 210, 127, 0.45)');
                aura.addColorStop(1, 'rgba(255, 210, 127, 0)');
                ctx.fillStyle = aura;
                ctx.beginPath();
                ctx.arc(px, py, 28, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#FFEAB8';
                ctx.beginPath();
                ctx.arc(px, py, s.r, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // 普通星：冷白偏蓝
                ctx.fillStyle = `rgba(220, 232, 255, ${s.brightness})`;
                ctx.beginPath();
                ctx.arc(px, py, s.r, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    };

    // DPR 缩放：每次 resize 都重置 transform 再 scale，避免叠加
    const setupCanvas = () => {
        const canvas = document.createElement('canvas');
        canvas.id = 'd6k-canvas';
        const ctx = canvas.getContext('2d');

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            const w = window.innerWidth;
            const h = window.innerHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            ctx.setTransform(1, 0, 0, 1, 0, 0); // 关键：先 reset 再 scale
            ctx.scale(dpr, dpr);
        };
        resize();
        window.addEventListener('resize', resize);
        onCleanup(() => window.removeEventListener('resize', resize));

        return { canvas, ctx };
    };

    // 跑 stage 1 直到数字 + 副标题完全可见 + 驻留 4.5s 结束。
    // 返回 { number, subtitle } 让 caller 决定是否淡出（开发模式可保留）。
    const runStage1_Starfield = async ({ keepText = false } = {}) => {
        // 接管页面：隐藏玫瑰星云、噪点、鼠标光晕、主页内容
        document.body.classList.add('d6k-active', 'd6k-stage1-only');

        const stage = document.createElement('div');
        stage.id = 'd6k-stage';

        const { canvas, ctx } = setupCanvas();
        state.canvas = canvas;
        state.canvasCtx = ctx;
        state.starfield = computeStarfield();

        const number = document.createElement('div');
        number.id = 'd6k-number';
        number.textContent = '6000';

        const subtitle = document.createElement('div');
        subtitle.id = 'd6k-subtitle';
        subtitle.textContent = '我数过每一天。';

        stage.appendChild(canvas);
        stage.appendChild(number);
        stage.appendChild(subtitle);
        document.body.appendChild(stage);

        // 渐进绘制：星点从 0 数到 6000
        const drawDuration = prefersReducedMotion() ? 500 : 2200;
        const startT = performance.now();
        await new Promise((resolve) => {
            const tick = (now) => {
                const elapsed = now - startT;
                const p = Math.min(1, elapsed / drawDuration);
                const eased = 1 - Math.pow(1 - p, 3);
                renderStarfield(canvas, ctx, state.starfield, eased);
                if (p < 1) {
                    requestAnimationFrame(tick);
                } else {
                    resolve();
                }
            };
            requestAnimationFrame(tick);
        });

        canvas.classList.add('is-visible');
        await sleep(250);

        // 数字浮现：CSS opacity transition 2s
        number.classList.add('is-visible');
        // 副标题错峰浮现
        await sleep(600);
        subtitle.classList.add('is-visible');

        // 等数字浮现完成
        await sleep(900);
        // 数字完全可见后短暂停留，让她能认出"6000"和读完"我数过每一天"
        await sleep(2800);

        if (keepText) {
            // 测试模式：保留数字 + 副标题，停在驻留状态，等用户主动 cleanup
            return { number, subtitle };
        }

        number.style.transition = 'opacity 1s ease';
        subtitle.style.transition = 'opacity 1s ease';
        number.style.opacity = '0';
        subtitle.style.opacity = '0';
        await sleep(1000);
        number.remove();
        subtitle.remove();
        return { number: null, subtitle: null };
    };

    // ============================================================
    // 主页变形：用 body class 触发 CSS 隐藏所有原主页元素
    // 不再修改 hero/counter/btn 文字（被 overlay 完全盖住）
    // ============================================================
    const transformHeroSilently = () => {
        document.body.classList.add('is-day-6000');
    };

    const restoreHero = () => {
        document.body.classList.remove('is-day-6000');
        document.querySelector('#d6k-stage2-overlay')?.remove();
    };

    const loadMemoryRibbon = async (track) => {
        try {
            const res = await fetch('data.json', { cache: 'no-cache' });
            const data = await res.json();
            const frames = data.slice(0, 12);

            const fragment = document.createDocumentFragment();
            for (const item of frames) {
                const frame = document.createElement('figure');
                frame.className = 'd6k-memory-frame';
                const img = document.createElement('img');
                img.loading = 'lazy';
                img.alt = item.loveLetter || item.date || 'Love Minnie memory';
                img.src = `images/${item.filename}`;
                frame.appendChild(img);
                fragment.appendChild(frame);
            }
            track.appendChild(fragment);
        } catch (e) {
            track.hidden = true;
        }
    };

    // ============================================================
    // 构建 Stage 2 Overlay · 夕阳玫瑰金主页
    // 复刻徐老师提供的设计参考图
    // ============================================================
    const buildStage2Overlay = () => {
        if (document.getElementById('d6k-stage2-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'd6k-stage2-overlay';

        // 背景图层
        const bgImg = document.createElement('div');
        bgImg.className = 'd6k-bg-image';
        overlay.appendChild(bgImg);

        // 整体柔光叠加（保证文字可读性）
        const glow = document.createElement('div');
        glow.className = 'd6k-bg-overlay';
        overlay.appendChild(glow);

        // 顶部条：FOR MY WIFE | EN ❤
        const topBar = document.createElement('header');
        topBar.className = 'd6k-top-bar';
        topBar.innerHTML = `
            <span class="d6k-top-left">FOR MY WIFE</span>
            <div class="d6k-top-right">
                <a class="d6k-lang" role="button">EN</a>
                <button class="d6k-letter-btn" id="d6k-envelope"
                        aria-label="打开 6000 天情书"
                        type="button">♥</button>
            </div>
        `;
        overlay.appendChild(topBar);

        const cue = document.createElement('p');
        cue.className = 'd6k-letter-cue';
        cue.textContent = '熊老婆，点开今天这封信。';
        overlay.appendChild(cue);

        // 中央主体
        const center = document.createElement('main');
        center.className = 'd6k-center';
        center.innerHTML = `
            <div class="d6k-handwriting">For my wife<span class="heart">♥</span></div>
            <h1 class="d6k-hero">
                <span class="d6k-num">6000</span>
                <span class="d6k-word">DAYS</span>
            </h1>
            <p class="d6k-sub">
                <span class="d6k-sub-heart">♥</span>
                我们在一起 6000 天啦
                <span class="d6k-sub-heart">♥</span>
            </p>
            <p class="d6k-origin">2009.12.10 · QUANZHOU → 2026.05.14 · BEIJING</p>
            <nav class="d6k-nav">
                <a href="index.html" class="d6k-nav-link is-active">HOME</a>
                <a href="gallery.html" class="d6k-nav-link">GALLERY</a>
                <a href="moments.html" class="d6k-nav-link">MOMENTS</a>
                <span class="d6k-nav-icon">♥</span>
            </nav>
            <span class="d6k-deco-star s1">✦</span>
            <span class="d6k-deco-star s2">✧</span>
            <span class="d6k-deco-star s3">✦</span>
            <span class="d6k-deco-star s4">✧</span>
            <span class="d6k-deco-star s5">✦</span>
            <span class="d6k-deco-star s6">✧</span>
        `;
        // ribbon 注入到 .d6k-center 内、.d6k-nav 之后（同一 flex 流，避免跟 nav 重叠）
        const ribbon = document.createElement('section');
        ribbon.className = 'd6k-memory-ribbon';
        ribbon.setAttribute('aria-label', '最近的每日爱意图片');
        const navEl = center.querySelector('.d6k-nav');
        if (navEl) {
            navEl.insertAdjacentElement('afterend', ribbon);
        } else {
            center.appendChild(ribbon);
        }
        loadMemoryRibbon(ribbon);

        overlay.appendChild(center);

        // 底部：左下三行文案 + 右下箭头
        const bottom = document.createElement('footer');
        bottom.className = 'd6k-bottom';
        bottom.innerHTML = `
            <div class="d6k-corner-text">
                <p>6000 DAYS OF LOVE</p>
                <p>THANK YOU FOR BEING</p>
                <p>MY EVERYTHING.</p>
            </div>
            <div class="d6k-arrow" aria-hidden="true">↓</div>
        `;
        overlay.appendChild(bottom);

        document.body.appendChild(overlay);

        // ❤️ 按钮 = 信封 trigger（点击打开 stage 3 情书）
        const letterBtn = overlay.querySelector('#d6k-envelope');
        const openLetter = () => {
            if (envelopeOpened) return;
            envelopeOpened = true;
            if (state.autoOpenTimer) {
                clearTimeout(state.autoOpenTimer);
                state.autoOpenTimer = null;
            }
            runStage3_LetterOpen();
        };
        letterBtn.addEventListener('click', openLetter);
        letterBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openLetter();
            }
        });

        // 触发淡入
        requestAnimationFrame(() => {
            requestAnimationFrame(() => overlay.classList.add('is-visible'));
        });

        setTimeout(() => {
            overlay.classList.add('is-letter-ready');
        }, 1800);

        state.autoOpenTimer = setTimeout(openLetter, 9500);
    };

    // ============================================================
    // 过渡：stage1 → stage2
    // 静默激活主页 is-day-6000 + 构建 overlay → stage 容器淡出
    // ============================================================
    const runTransition_StageOut = async () => {
        // 1. 激活 day-6000 模式（CSS 隐藏所有原主页元素）
        transformHeroSilently();

        // 2. 构建 stage2 overlay（隐藏在 stage 容器后面）
        buildStage2Overlay();

        // 3. 主页内容恢复显示（移除 stage1-only 限制）
        document.body.classList.remove('d6k-stage1-only');

        // 4. Stage 1 容器淡出，露出 overlay
        const stage = document.getElementById('d6k-stage');
        if (stage) {
            stage.classList.add('is-fading-out');
        }

        // 5. 等淡出完成
        await sleep(prefersReducedMotion() ? 350 : 1000);

        if (stage) stage.remove();
    };

    // 仅 stage2 状态（跳过 stage1 用，testStage(2) 调用）
    const runStage2_HeroAndEnvelope = () => {
        document.body.classList.add('d6k-active');
        transformHeroSilently();
        buildStage2Overlay();
    };

    // ============================================================
    // 阶段 3 · 信封展开 (Letter Open)
    // 全屏遮罩 + 历史星图 + 情书逐行浮现 + 画卷收束 + 配乐
    // ============================================================

    const runStage3_LetterOpen = () => {
        const overlay = document.createElement('div');
        overlay.id = 'd6k-letter-overlay';

        // 历史星图背景 Canvas
        const skyCanvas = document.createElement('canvas');
        skyCanvas.id = 'd6k-historical-sky';
        overlay.appendChild(skyCanvas);

        // 折起/展开切换按钮（让 Minnie 可以折起信纸只看星空）
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'd6k-letter-toggle';
        toggleBtn.setAttribute('aria-label', '折起信纸，只看星空');
        toggleBtn.title = '折起信纸，只看星空';
        toggleBtn.textContent = '✦';
        toggleBtn.type = 'button';

        // 关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.id = 'd6k-letter-close';
        closeBtn.setAttribute('aria-label', '关闭情书');
        closeBtn.textContent = '✕';

        // 信纸
        const letter = document.createElement('article');
        letter.id = 'd6k-letter';
        letter.setAttribute('role', 'document');

        // 情书每一行
        const lineEls = LETTER_LINES.map(text => {
            const p = document.createElement('p');
            p.className = 'd6k-letter-line';
            if (text === '') {
                p.classList.add('is-blank');
            } else if (text.startsWith('>>')) {
                p.classList.add('is-signoff');
                p.textContent = text.slice(2);
            } else {
                p.textContent = text;
            }
            letter.appendChild(p);
            return p;
        });

        // 画卷收束容器（情书末尾）
        const filmstrip = document.createElement('div');
        filmstrip.id = 'd6k-filmstrip';
        filmstrip.innerHTML = `
            <div id="d6k-filmstrip-label">— 一帧帧的我们 —</div>
            <div id="d6k-filmstrip-track"></div>
        `;
        letter.appendChild(filmstrip);

        overlay.appendChild(closeBtn);
        overlay.appendChild(toggleBtn);
        overlay.appendChild(letter);
        document.body.appendChild(overlay);

        // 触发淡入
        requestAnimationFrame(() => overlay.classList.add('is-open'));

        // 渲染历史星图（先用占位伪随机分布，A3 阶段替换）
        renderHistoricalSky(skyCanvas);
        const onResize = () => renderHistoricalSky(skyCanvas);
        window.addEventListener('resize', onResize);
        onCleanup(() => window.removeEventListener('resize', onResize));

        // 启动音频
        playMusic();

        // 逐行浮现情书
        revealLetterLines(lineEls).then(() => {
            // 情书读完后展开画卷
            return loadAndRenderFilmstrip(filmstrip.querySelector('#d6k-filmstrip-track'));
        }).then(() => {
            filmstrip.classList.add('is-visible');
        });

        // 折起/展开交互
        toggleBtn.addEventListener('click', () => {
            const hidden = overlay.classList.toggle('is-letter-hidden');
            toggleBtn.textContent = hidden ? '✉' : '✦';
            toggleBtn.setAttribute('aria-label',
                hidden ? '展开情书' : '折起信纸，只看星空');
            toggleBtn.title = hidden ? '展开情书' : '折起信纸，只看星空';
        });

        // 关闭交互
        closeBtn.addEventListener('click', closeLetter);

        function closeLetter() {
            overlay.classList.remove('is-open');
            stopMusic();
            setTimeout(() => overlay.remove(), 1100);
        }
    };

    /**
     * 真实历史星图：2009-12-10 22:00 CST 泉州（24.87°N, 118.66°E）
     * 33 颗精选明亮恒星按当夜真实位置（球面三角公式计算）投影到南方天空视野，
     * 暗背景星海仍用 seeded 伪随机填充。猎户座连线突出，让 Minnie 一眼认出。
     */
    const renderHistoricalSky = (canvas) => {
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const w = window.innerWidth;
        const h = window.innerHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);

        // 渐变底色（午夜紫蓝）
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#0a0518');
        bgGrad.addColorStop(0.5, '#0f0b22');
        bgGrad.addColorStop(1, '#06030f');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // 银河带（柔和的对角光带）
        const milkyGrad = ctx.createLinearGradient(0, h * 0.3, w, h * 0.7);
        milkyGrad.addColorStop(0, 'rgba(180, 200, 255, 0)');
        milkyGrad.addColorStop(0.5, 'rgba(180, 200, 255, 0.04)');
        milkyGrad.addColorStop(1, 'rgba(180, 200, 255, 0)');
        ctx.fillStyle = milkyGrad;
        ctx.fillRect(0, 0, w, h);

        // 1500 颗暗背景星（seeded 伪随机，作为"星海"填充）
        const rand = mulberry32(20091210);
        for (let i = 0; i < 1500; i++) {
            const x = rand() * w;
            const y = rand() * h;
            const r = rand() * 0.8 + 0.2;
            ctx.fillStyle = `rgba(220, 230, 255, ${rand() * 0.4 + 0.15})`;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        // ====== 真实历史星位计算 ======
        const obsDate = new Date(ORIGIN.date);  // ISO 字符串自动按时区解析
        const jd = toJulianDay(obsDate);
        const lst = localSiderealTime(jd, ORIGIN.lon);

        // 投影：朝南视野，方位角相对正南 ±110° 映射到水平 ±92% 屏宽
        //   - 视野范围：az 70° (东偏北) 到 290° (西偏北)，覆盖整个南半天
        //   - 仰角 0-90° 映射到屏幕高度（地平线在底部 80px 处，天顶在顶部）
        //   - 这样猎户、大犬、小犬、双子、金牛、御夫、昴宿等冬夜南方星座都在视野内
        const projectStar = (altDeg, azDeg) => {
            let azOffset = azDeg - 180;  // 相对正南方向
            if (azOffset > 180)  azOffset -= 360;
            if (azOffset < -180) azOffset += 360;
            if (Math.abs(azOffset) > 110) return null;  // 视野外
            if (altDeg < -8) return null;               // 地平线以下太多
            const x = w / 2 + (azOffset / 110) * (w / 2) * 0.92;
            const y = h - 80 - (altDeg / 90) * (h - 140);
            return { x, y };
        };

        // 计算每颗明亮星的屏幕位置
        const positions = {};
        for (const star of HISTORIC_STARS) {
            const { altDeg, azDeg } = equatorialToAltAz(
                star.ra, star.dec, ORIGIN.lat, lst);
            const pos = projectStar(altDeg, azDeg);
            if (pos) positions[star.name] = { ...pos, mag: star.mag, name: star.name };
        }

        // 先画猎户座连线（在恒星之下，让恒星盖住接点）
        ctx.strokeStyle = 'rgba(180, 200, 255, 0.18)';
        ctx.lineWidth = 0.8;
        for (const [a, b] of STAR_LINES) {
            const sa = positions[a], sb = positions[b];
            if (sa && sb) {
                ctx.beginPath();
                ctx.moveTo(sa.x, sa.y);
                ctx.lineTo(sb.x, sb.y);
                ctx.stroke();
            }
        }

        // 画明亮恒星（按视星等调大小与亮度，最亮的带光晕）
        for (const name in positions) {
            const s = positions[name];
            // 视星等映射：mag=-1.5 → r=4.5；mag=2 → r=1.5；mag=4 → r=0.6
            const r = Math.max(0.6, Math.min(4.5, 3.5 - s.mag * 0.65));
            const alpha = Math.max(0.45, Math.min(1, 1 - s.mag * 0.16));

            // 光晕（仅 mag < 1.5 的亮星）
            if (s.mag < 1.5) {
                const auraR = 16 - s.mag * 3;
                const aura = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, auraR);
                aura.addColorStop(0, `rgba(255, 240, 220, ${0.55 - s.mag * 0.06})`);
                aura.addColorStop(1, 'rgba(255, 240, 220, 0)');
                ctx.fillStyle = aura;
                ctx.beginPath();
                ctx.arc(s.x, s.y, auraR, 0, Math.PI * 2);
                ctx.fill();
            }

            // 核心
            ctx.fillStyle = `rgba(255, 246, 229, ${alpha})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        // 右下角标注（出处、日期、坐标）
        ctx.fillStyle = 'rgba(245, 230, 200, 0.42)';
        ctx.font = '12px "LXGW WenKai Screen", serif';
        ctx.textAlign = 'right';
        ctx.fillText(
            `${ORIGIN.cityCN} · 2009-12-10 22:00 · 24.87°N 118.66°E`,
            w - 24, h - 24
        );
    };

    const revealLetterLines = async (lineEls) => {
        const baseDelay = prefersReducedMotion() ? 60 : 320;
        for (const el of lineEls) {
            el.classList.add('is-visible');
            await sleep(el.classList.contains('is-blank') ? baseDelay * 0.4 : baseDelay);
        }
        // 让最后一行驻留一会儿再展开画卷
        await sleep(prefersReducedMotion() ? 300 : 800);
    };

    const loadAndRenderFilmstrip = async (track) => {
        try {
            const res = await fetch('data.json', { cache: 'no-cache' });
            const data = await res.json();

            // data.json 是按日期降序的数组：[{ id, date, filename, ... }, ...]
            // 取最近的 24 张作为画卷
            const frames = data.slice(0, 24).reverse();

            const fragment = document.createDocumentFragment();
            for (const item of frames) {
                const frame = document.createElement('div');
                frame.className = 'd6k-filmstrip-frame';
                const img = document.createElement('img');
                img.loading = 'lazy';
                img.alt = item.title || item.date || '';
                img.src = `images/${item.filename}`;
                frame.appendChild(img);
                fragment.appendChild(frame);
            }
            track.appendChild(fragment);
        } catch (e) {
            console.warn('Day6000: 画卷加载失败', e);
        }
    };

    // ============================================================
    // 配乐
    // ============================================================

    const playMusic = () => {
        if (!AUDIO_SRC) return;
        if (state.audioEl) return;
        const audio = document.createElement('audio');
        audio.src = AUDIO_SRC;
        audio.loop = true;
        audio.volume = 0.0;
        audio.style.display = 'none';
        document.body.appendChild(audio);
        state.audioEl = audio;

        audio.play().then(() => {
            // 渐入到 0.45（避免突然砸耳朵）
            const target = 0.45;
            const fadeMs = 2400;
            const start = performance.now();
            const fade = (now) => {
                const p = Math.min(1, (now - start) / fadeMs);
                audio.volume = target * p;
                if (p < 1) requestAnimationFrame(fade);
            };
            requestAnimationFrame(fade);
        }).catch(err => {
            // 文件不存在或被浏览器策略拦截，静默处理
            console.info('Day6000: 配乐未播放（可能 mp3 文件缺失或浏览器策略）', err);
        });
    };

    const stopMusic = () => {
        if (!state.audioEl) return;
        const audio = state.audioEl;
        const start = performance.now();
        const startVol = audio.volume;
        const fade = (now) => {
            const p = Math.min(1, (now - start) / 1200);
            audio.volume = startVol * (1 - p);
            if (p < 1) {
                requestAnimationFrame(fade);
            } else {
                audio.pause();
                audio.remove();
                state.audioEl = null;
            }
        };
        requestAnimationFrame(fade);
    };

    // ============================================================
    // 入口与清理
    // ============================================================

    const start = async (anniversary) => {
        if (document.body.dataset.d6kRunning === '1') {
            console.warn('Day6000: 已经在运行中，忽略重复触发');
            return;
        }
        document.body.dataset.d6kRunning = '1';
        state.anniversary = anniversary;

        try {
            await runStage1_Starfield();
            await runTransition_StageOut();
        } catch (e) {
            console.error('Day6000: 叙事流出错', e);
        }
    };

    const cleanup = () => {
        if (state.autoOpenTimer) {
            clearTimeout(state.autoOpenTimer);
            state.autoOpenTimer = null;
        }
        // DOM 清理
        document.querySelector('#d6k-stage')?.remove();
        document.querySelector('#d6k-stage2-overlay')?.remove();
        document.querySelector('#d6k-letter-overlay')?.remove();
        // 主页恢复
        restoreHero();
        // body class 复位
        document.body.classList.remove('d6k-active', 'd6k-stage1-only', 'is-day-6000');
        delete document.body.dataset.d6kRunning;
        envelopeOpened = false;
        stopMusic();
        state.cleanupFns.forEach(fn => { try { fn(); } catch {} });
        state.cleanupFns = [];
    };

    // 测试单个阶段（开发用，独立短路，不连贯走完整流）
    const testStage = async (n) => {
        cleanup();
        await sleep(80); // 让 DOM 与样式过渡完成
        document.body.dataset.d6kRunning = '1';

        if (n === 1) {
            // 测试 stage 1：保留数字 + 副标题在画面上，让用户看清完整状态。
            // 用户看完后点 "清空" 退出。
            await runStage1_Starfield({ keepText: true });
        } else if (n === 2) {
            // 直接进入 stage2 状态：变形主页 + 信封浮现，跳过星空
            runStage2_HeroAndEnvelope();
        } else if (n === 3) {
            // 直接进入 stage3：先静默把 stage2 状态铺好，然后信封展开
            runStage2_HeroAndEnvelope();
            envelopeOpened = true;
            runStage3_LetterOpen();
        } else {
            console.warn('Day6000.testStage: 阶段编号应为 1/2/3');
        }
    };

    window.Day6000 = { start, cleanup, testStage };

    // ============================================================
    // 开发预览浮条（仅在非生产域名显示，部署前删除）
    // ============================================================
    const isDevHost = () => {
        if (new URLSearchParams(window.location.search).get('d6kDev') !== '1') return false;
        const host = window.location.hostname;
        // 生产域名：github.io 或 zeabur 部署，正常隐藏控制条
        if (host.endsWith('github.io')) return false;
        if (host.endsWith('zeabur.app')) return false;
        if (host.endsWith('zeabur.com')) return false;
        // 其它情况（本地、预览面板、自建服务）都显示
        return true;
    };

    const injectDevPanel = () => {
        if (!isDevHost()) return;
        if (document.getElementById('d6k-dev-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'd6k-dev-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 16px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 9799;
            background: rgba(8, 4, 18, 0.92);
            border: 1px solid rgba(255, 210, 127, 0.35);
            border-radius: 999px;
            padding: 8px 12px;
            display: flex;
            gap: 6px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.4);
            font-family: 'Inter', sans-serif;
            font-size: 12px;
        `;

        const mkBtn = (label, onClick) => {
            const b = document.createElement('button');
            b.textContent = label;
            b.style.cssText = `
                background: transparent;
                color: #F5E6C8;
                border: 1px solid rgba(245, 230, 200, 0.3);
                border-radius: 999px;
                padding: 6px 12px;
                cursor: pointer;
                white-space: nowrap;
                transition: background 0.2s ease;
            `;
            b.onmouseenter = () => b.style.background = 'rgba(255, 210, 127, 0.12)';
            b.onmouseleave = () => b.style.background = 'transparent';
            b.onclick = onClick;
            return b;
        };

        const label = document.createElement('span');
        label.textContent = '🔧 6000 天预览：';
        label.style.cssText = 'color: rgba(245, 230, 200, 0.6); align-self: center; padding: 0 4px;';
        panel.appendChild(label);

        panel.appendChild(mkBtn('完整跑', () => { cleanup(); start(); }));
        panel.appendChild(mkBtn('① 星空', () => testStage(1)));
        panel.appendChild(mkBtn('② 主页变形', () => testStage(2)));
        panel.appendChild(mkBtn('③ 信封情书', () => testStage(3)));
        panel.appendChild(mkBtn('清空', () => cleanup()));

        document.body.appendChild(panel);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectDevPanel);
    } else {
        injectDevPanel();
    }

})();
