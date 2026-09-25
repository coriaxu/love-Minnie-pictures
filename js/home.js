/**
 * 首页 · 月洞窗与向日葵星盘（2026-09 改版）
 *
 * - 星盘：在一起的每一天是一颗点，按黄金角（≈137.5°）排成向日葵花盘。
 *   离月洞窗最近的是今天，越往外越早；有画信的日子是贴着窗的一圈玫瑰色，
 *   每年 12 月 10 日与 9 月 22 日稍亮一些。
 * - 月洞窗：隔着"窗纸"看见今天那幅画；画还没上传时是一轮满月，文案改成"还在路上"。
 * - 预览：URL 加 ?date=YYYY-MM-DD 可把"今天"换成指定日期（画廊页同样支持）。
 */
(function () {
    'use strict';

    const START = new Date(2009, 11, 10);        // 在一起的第 1 天
    const FIRST_LETTER = new Date(2025, 11, 24); // 第 1 封画信
    const ARCHIVE_FROM = new Date(2026, 4, 15);  // 6000 天纪念页存档入口
    const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
    const WEEKDAYS = '日一二三四五六';

    const params = new URLSearchParams(window.location.search);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const today = (() => {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(params.get('date') || '');
        const date = match ? new Date(+match[1], +match[2] - 1, +match[3]) : new Date();
        date.setHours(0, 0, 0, 0);
        return date;
    })();

    const utcDay = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    const daysBetween = (a, b) => Math.round((utcDay(b) - utcDay(a)) / 86400000);
    const pad = (n) => String(n).padStart(2, '0');

    const dayNumber = Math.max(1, daysBetween(START, today) + 1);
    const letterCount = Math.max(0, daysBetween(FIRST_LETTER, today) + 1);
    const ymd = `${today.getFullYear()}${pad(today.getMonth() + 1)}${pad(today.getDate())}`;

    // 预览日期要带到画廊
    const galleryHref = params.has('date') ? `gallery.html?date=${encodeURIComponent(params.get('date'))}` : 'gallery.html';

    const body = document.body;
    const skyCanvas = document.getElementById('home-sky');
    const skyCtx = skyCanvas.getContext('2d');
    const discCanvas = document.getElementById('home-disc-canvas');
    const discCtx = discCanvas.getContext('2d');
    const disc = document.getElementById('home-disc');
    const moon = document.getElementById('home-moon');
    const status = document.getElementById('home-status');
    const meta = document.getElementById('home-meta');
    const cta = document.getElementById('home-cta');

    moon.href = galleryHref;
    cta.href = galleryHref;

    // ------------------------------------------------------------
    // 文字
    // ------------------------------------------------------------
    const esc = window.Typeset ? window.Typeset.escapeHtml : (s) => s;
    const unit = (html) => `<span class="ts-u">${html}</span>`;
    const sep = '<span class="ts-sep"> · </span><wbr>';
    meta.innerHTML = [
        unit(esc(`${today.getMonth() + 1}月${today.getDate()}日`)),
        unit(esc(`星期${WEEKDAYS[today.getDay()]}`)),
        unit(`在一起的第 <span class="num">${dayNumber}</span> 天`)
    ].join(sep);

    const STATUS = {
        arrived: { line: '今天的画信到了。', cta: '拆开今天的画信', label: '拆开今天的画信' },
        waiting: { line: '今天这封还在路上。', cta: '先看看昨天的', label: '今天这封还在路上，先看看昨天的' }
    };

    function setStatus(kind) {
        const copy = STATUS[kind];
        status.textContent = copy.line;
        status.classList.remove('is-pending');
        cta.textContent = copy.cta;
        moon.setAttribute('aria-label', copy.label);
        body.dataset.letter = kind;
    }

    // 先藏起状态句，等知道今天的画到没到再显示，避免文案跳变
    status.classList.add('is-pending');

    // ------------------------------------------------------------
    // 今天的画：放进月洞窗
    // ------------------------------------------------------------
    let settled = false;
    const art = new Image();
    art.decoding = 'async';
    art.onload = () => {
        settled = true;
        moon.style.setProperty('--art', `url("${art.src}")`);
        moon.classList.add('has-art');
        setStatus('arrived');
    };
    art.onerror = () => {
        settled = true;
        setStatus('waiting');
    };
    art.src = `images/${ymd}.webp`;
    // 网速很慢时先按"到了"显示；真没有画，onerror 会再改成"还在路上"
    setTimeout(() => { if (!settled) setStatus('arrived'); }, 2500);

    // ------------------------------------------------------------
    // 星盘
    // ------------------------------------------------------------
    const mulberry32 = (seed) => {
        let t = seed;
        return () => {
            t |= 0;
            t = (t + 0x6D2B79F5) | 0;
            let r = Math.imul(t ^ (t >>> 15), 1 | t);
            r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
            return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
        };
    };

    // 每颗点对应的日期特征只和"今天"有关，与屏幕尺寸无关，预先算好
    const dayKinds = (() => {
        const kinds = new Uint8Array(dayNumber); // 0 普通 1 有画信 2 恋爱纪念日 3 生日
        const cursor = new Date(today);
        for (let k = 0; k < dayNumber; k++) {
            const m = cursor.getMonth();
            const d = cursor.getDate();
            if (m === 11 && d === 10) kinds[k] = 2;
            else if (m === 8 && d === 22) kinds[k] = 3;
            else if (k < letterCount) kinds[k] = 1;
            cursor.setDate(cursor.getDate() - 1);
        }
        return kinds;
    })();

    const dpr = () => Math.min(window.devicePixelRatio || 1, 2.5);
    let dots = [];
    let todayDot = null;
    let animating = false;

    // 星盘坐标以星盘自身为参照，版面怎么挪都不会和月洞窗错位
    function layoutDisc() {
        const size = disc.clientWidth;
        const ratio = dpr();
        discCanvas.width = Math.round(size * ratio);
        discCanvas.height = Math.round(size * ratio);
        discCtx.setTransform(ratio, 0, 0, ratio, 0, 0);

        const c = size / 2;
        const outer = size / 2;
        const inner = moon.offsetWidth / 2 + Math.max(7, outer * 0.055);
        // 窗纸的朦胧度：认得出是哪幅画，又留一点"拆开"的余地
        moon.style.setProperty('--moon-blur', `${Math.max(2, Math.round(size / 120))}px`);

        const spacing = Math.sqrt((Math.PI * (outer * outer - inner * inner)) / dayNumber);
        const base = Math.max(0.42, spacing * 0.27);
        const rand = mulberry32(20091210);

        dots = new Array(dayNumber);
        for (let k = 0; k < dayNumber; k++) {
            const t = (k + 0.5) / dayNumber;
            const radius = Math.sqrt(inner * inner + (outer * outer - inner * inner) * t);
            const angle = k * GOLDEN_ANGLE - Math.PI / 2;
            const jitter = rand();
            const kind = dayKinds[k];
            let dotSize = base * (0.8 + jitter * 0.45);
            let color;
            if (kind === 2) {
                dotSize = base * 1.55;
                color = 'rgba(240, 207, 138, 0.82)';
            } else if (kind === 3) {
                dotSize = base * 1.45;
                color = 'rgba(245, 179, 195, 0.78)';
            } else if (kind === 1) {
                dotSize = base * (1.05 + jitter * 0.3);
                color = `rgba(243, 176, 192, ${(0.5 + 0.35 * (1 - k / Math.max(1, letterCount))).toFixed(3)})`;
            } else {
                const alpha = 0.14 + 0.36 * Math.pow(1 - t, 0.85) + (jitter - 0.5) * 0.08;
                color = `rgba(244, 230, 200, ${Math.max(0.06, alpha).toFixed(3)})`;
            }
            dots[k] = { x: c + Math.cos(angle) * radius, y: c + Math.sin(angle) * radius, size: dotSize, color };
        }
        todayDot = { ...dots[0], size: Math.max(1.6, base * 2.6) };
    }

    // 背景零星的星：避开星盘所在的位置
    function drawSky() {
        const ratio = dpr();
        const w = window.innerWidth;
        const h = window.innerHeight;
        skyCanvas.width = Math.round(w * ratio);
        skyCanvas.height = Math.round(h * ratio);
        skyCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
        const d = disc.getBoundingClientRect();
        const cx = d.left + d.width / 2;
        const cy = d.top + d.height / 2;
        const rand = mulberry32(5141);
        const count = Math.round((w * h) / 9000);
        for (let i = 0; i < count; i++) {
            const x = rand() * w;
            const y = rand() * h;
            const size = 0.35 + rand() * 0.7;
            const alpha = 0.12 + rand() * 0.38;
            if (Math.hypot(x - cx, y - cy) < d.width / 2 + 18) continue;
            skyCtx.fillStyle = `rgba(236, 226, 255, ${alpha.toFixed(3)})`;
            skyCtx.beginPath();
            skyCtx.arc(x, y, size, 0, Math.PI * 2);
            skyCtx.fill();
        }
    }

    // 下标越大越早：从 hi 画到 lo（含两端）
    function drawRange(hi, lo) {
        for (let k = hi; k >= lo; k--) {
            const p = dots[k];
            discCtx.fillStyle = p.color;
            discCtx.beginPath();
            discCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            discCtx.fill();
        }
    }

    function drawToday() {
        const p = todayDot;
        const glow = discCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 6);
        glow.addColorStop(0, 'rgba(255, 226, 160, 0.55)');
        glow.addColorStop(1, 'rgba(255, 226, 160, 0)');
        discCtx.fillStyle = glow;
        discCtx.beginPath();
        discCtx.arc(p.x, p.y, p.size * 6, 0, Math.PI * 2);
        discCtx.fill();
        discCtx.fillStyle = '#ffe6a8';
        discCtx.beginPath();
        discCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        discCtx.fill();
    }

    function drawDisc() {
        discCtx.clearRect(0, 0, discCanvas.width, discCanvas.height);
        drawRange(dots.length - 1, 0);
        drawToday();
    }

    // 入场：从最早那一天一路汇向今天
    function animateDisc() {
        animating = true;
        discCtx.clearRect(0, 0, discCanvas.width, discCanvas.height);
        const duration = 1500;
        const start = performance.now();
        let next = dots.length - 1;
        const step = (now) => {
            if (!animating) return;
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 2.2);
            const target = Math.max(0, Math.round((dots.length - 1) * (1 - eased)));
            if (target <= next) {
                drawRange(next, target);
                next = target - 1;
            }
            if (p < 1) {
                requestAnimationFrame(step);
                return;
            }
            if (next >= 0) drawRange(next, 0);
            drawToday();
            animating = false;
        };
        requestAnimationFrame(step);
    }

    // 尺寸变化（旋转屏幕、字体加载后版面微调）时整盘重画
    let lastSize = 0;
    const relayout = () => {
        drawSky();
        if (disc.clientWidth !== lastSize) {
            lastSize = disc.clientWidth;
            animating = false;
            layoutDisc();
            drawDisc();
        }
    };
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(relayout, 120);
    });

    // ------------------------------------------------------------
    // 入场节奏：等字体到位再显字（最多等 1.2 秒）
    // ------------------------------------------------------------
    const fontsReady = document.fonts
        ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1200))])
        : Promise.resolve();

    lastSize = disc.clientWidth;
    layoutDisc();
    drawSky();
    if (reduceMotion) {
        drawDisc();
    } else {
        animateDisc();
    }
    fontsReady.then(() => {
        // 字体换上后版面可能挪动几像素，背景星重新避让一次
        drawSky();
        requestAnimationFrame(() => body.classList.add('is-ready'));
    });

    // ------------------------------------------------------------
    // 拆开：月洞窗放大铺满屏幕，画面变清晰，然后进入画廊
    // ------------------------------------------------------------
    function openLetter(event) {
        if (event && (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1)) return;
        if (event) event.preventDefault();
        if (body.classList.contains('is-opening')) return;
        if (reduceMotion) {
            window.location.href = galleryHref;
            return;
        }
        const r = moon.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const far = Math.max(Math.hypot(cx, cy), Math.hypot(w - cx, cy), Math.hypot(cx, h - cy), Math.hypot(w - cx, h - cy));
        const scale = (far * 2) / r.width;
        body.classList.add('is-opening');
        moon.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(3)})`;
        setTimeout(() => { window.location.href = galleryHref; }, 680);
    }

    moon.addEventListener('click', openLetter);
    cta.addEventListener('click', openLetter);

    // 从画廊返回时（浏览器可能直接还原页面），把放大的窗收回去
    window.addEventListener('pageshow', (event) => {
        if (!event.persisted) return;
        body.classList.remove('is-opening');
        moon.style.transform = '';
    });

    // ------------------------------------------------------------
    // 6000 天纪念页存档入口（2026-05-15 起常驻；?d6k 预览时也显示）
    // ------------------------------------------------------------
    const archiveBtn = document.getElementById('day-6000-archive');
    if (archiveBtn && (utcDay(new Date()) >= utcDay(ARCHIVE_FROM) || params.has('d6k'))) {
        archiveBtn.hidden = false;
        archiveBtn.addEventListener('click', () => {
            if (window.Day6000 && typeof window.Day6000.start === 'function') {
                window.Day6000.cleanup?.();
                setTimeout(() => {
                    window.Day6000.start({ id: 'day-6000', name: '6000 天纪念日', type: 'C', effect: 'day-6000' });
                }, 80);
                return;
            }
            window.location.href = 'index.html?d6k=1';
        });
    }
})();
