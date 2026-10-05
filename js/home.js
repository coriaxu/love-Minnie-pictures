/**
 * 首页 · 星夜园林（2026-10 改版）
 *
 * - 版式：左边是时间，中间是画，右边是话（手机上话在上、画在下）。
 * - 星盘：在一起的每一天是一颗点，按黄金角（≈137.5°）排成向日葵花盘，越往外越早；
 *   每年 12 月 10 日与 9 月 22 日稍亮一些。
 * - 月轮：月洞窗外一圈 30 颗点，是最近三十天，今天在正上方，逆时针往回。
 *   手指沿月轮转（或前一天 / 后一天按钮、键盘 ← →），窗里的画和文字跟着换。
 * - 月洞窗：隔着"窗纸"看见那天的画。点一下直接拆开；按住 1.1 秒，雾散尽后拆开。
 *   今天的画还没上传时窗里是一轮满月，文案改成"还在路上"。
 * - 预览：URL 加 ?date=YYYY-MM-DD 可把"今天"换成指定日期（画廊页同样支持）。
 */
(function () {
    'use strict';

    const START = new Date(2009, 11, 10);        // 在一起的第 1 天
    const FIRST_LETTER = new Date(2025, 11, 24); // 第 1 封画信
    const ARCHIVE_FROM = new Date(2026, 4, 15);  // 6000 天纪念页存档入口
    const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
    const WEEKDAYS = '日一二三四五六';
    const RING_DAYS = 30;
    const RING_STEP = 360 / RING_DAYS;           // 月轮上一天 12°
    const RING_RADIUS = 25.5;                    // 月轮半径，占星盘直径的百分比
    const SPIRAL_INNER = 0.292;                  // 星盘最里圈半径，占直径的比例（给月轮让位）
    const HOLD_MS = 1100;                        // 按住多久雾散尽
    const TAP_MS = 260;                          // 短于这个算"点一下"
    const SYNODIC = 29.530588853;                // 朔望月（天）
    const NEW_MOON_REF = Date.UTC(2000, 0, 6, 18, 14);
    const THEME_STORAGE_KEY = 'love-minnie-theme-v3'; // 与画廊的季节设置共用
    const SEASONS = {
        spring: { name: '春', flower: '海棠' },
        summer: { name: '夏', flower: '荷' },
        autumn: { name: '秋', flower: '桂' },
        winter: { name: '冬', flower: '梅' }
    };

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
    const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const addDays = (d, n) => {
        const next = new Date(d);
        next.setDate(next.getDate() + n);
        return next;
    };

    const dayNumber = Math.max(1, daysBetween(START, today) + 1);
    const letterCount = Math.max(0, daysBetween(FIRST_LETTER, today) + 1);
    const todayIso = isoOf(today);
    const todaySrc = `images/${todayIso.replace(/-/g, '')}.webp`;

    // 预览日期要带到画廊（放在 # 之前）
    const withPreview = (href) => {
        if (!params.has('date')) return href;
        const [path, hash] = href.split('#');
        const joiner = path.includes('?') ? '&' : '?';
        return `${path}${joiner}date=${encodeURIComponent(params.get('date'))}${hash ? `#${hash}` : ''}`;
    };

    const body = document.body;
    const skyCanvas = document.getElementById('home-sky');
    const skyCtx = skyCanvas.getContext('2d');
    const discCanvas = document.getElementById('home-disc-canvas');
    const discCtx = discCanvas.getContext('2d');
    const disc = document.getElementById('home-disc');
    const ringEl = document.getElementById('home-ring');
    const moon = document.getElementById('home-moon');
    const status = document.getElementById('home-status');
    const meta = document.getElementById('home-meta');
    const cta = document.getElementById('home-cta');
    const ctaLabel = document.getElementById('home-cta-label');
    const prevBtn = document.getElementById('home-prev');
    const nextBtn = document.getElementById('home-next');
    const backBtns = document.querySelectorAll('.js-back');
    const dayNumEl = document.getElementById('home-day-num');
    const letterLine = document.getElementById('home-letter-line');
    const letterNumEl = document.getElementById('home-letter-num');
    const moonPhaseEl = document.getElementById('home-moon-phase');
    const moonNameEl = document.getElementById('home-moon-name');

    if (reduceMotion) body.classList.add('is-reduced');

    document.querySelectorAll('[data-gallery-link]').forEach((link) => {
        link.href = withPreview(link.getAttribute('href'));
    });

    // ------------------------------------------------------------
    // 季节标：跟着日期走；她在画廊里手动选过季节，就听她的
    // ------------------------------------------------------------
    const season = (() => {
        try {
            const stored = localStorage.getItem(THEME_STORAGE_KEY);
            if (SEASONS[stored]) return stored;
        } catch (err) {
            // 隐私模式读不到也没关系
        }
        const m = today.getMonth();
        if (m >= 2 && m <= 4) return 'spring';
        if (m >= 5 && m <= 7) return 'summer';
        if (m >= 8 && m <= 10) return 'autumn';
        return 'winter';
    })();
    body.dataset.season = season;

    const seasonEl = document.getElementById('home-season');
    seasonEl.innerHTML =
        '<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="3" r="1.6"/><circle cx="3" cy="7" r="1.6"/><circle cx="9" cy="7" r="1.6"/><circle cx="6" cy="9.6" r="1.2"/></svg>' +
        `${SEASONS[season].name} · ${SEASONS[season].flower}`;
    seasonEl.setAttribute('aria-label', `季节：${SEASONS[season].name}，${SEASONS[season].flower}`);
    seasonEl.hidden = false;

    const HAN_DIGITS = '〇一二三四五六七八九';
    const hanYear = String(today.getFullYear()).replace(/\d/g, (n) => HAN_DIGITS[n]);
    document.getElementById('home-foot-season').textContent = `星夜园林 · ${hanYear} · ${SEASONS[season].name}`;

    // 星盘外环的刻字
    const dotted = (d) => `${d.getFullYear()} · ${pad(d.getMonth() + 1)} · ${pad(d.getDate())}`;
    document.getElementById('home-orbit-text').textContent =
        `${dotted(START)} — ${dayNumber} DAYS — EVERY DAY IS A STAR — ${dotted(today)} — LOVE MINNIE — EVERY DAY IS A STAR —`;

    // ------------------------------------------------------------
    // 数据：哪些天有画信（读 data.json；读不到就按"第一封以来天天都有"推算）
    // ------------------------------------------------------------
    let byDate = null;
    let letterDates = [];

    const loadData = () => fetch('data.json', { cache: 'no-cache' })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`data.json ${res.status}`))))
        .then((list) => {
            if (!Array.isArray(list)) return;
            byDate = {};
            list.forEach((item) => {
                if (item && /^\d{4}-\d{2}-\d{2}$/.test(item.date) && item.filename) byDate[item.date] = item;
            });
            letterDates = Object.keys(byDate).sort();
        })
        .catch(() => {
            byDate = null;
        });

    const entryFor = (d) => {
        const key = isoOf(d);
        if (byDate) return byDate[key] || null;
        return d >= FIRST_LETTER && d <= today ? { date: key, filename: `${key.replace(/-/g, '')}.webp` } : null;
    };

    const letterNo = (d) => {
        const key = isoOf(d);
        if (byDate) return letterDates.filter((x) => x <= key).length;
        return Math.max(0, daysBetween(FIRST_LETTER, d) + 1);
    };

    // ------------------------------------------------------------
    // 月相：按月龄估算，够画一个小月亮和取名字
    // ------------------------------------------------------------
    const moonAge = (d) => {
        const days = (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12) - NEW_MOON_REF) / 86400000;
        return ((days % SYNODIC) + SYNODIC) % SYNODIC;
    };
    const moonName = (age) => {
        if (age < 1 || age >= 28.5) return '新月';
        if (age < 6.4) return '蛾眉月';
        if (age < 8.4) return '上弦月';
        if (age < 13.8) return '盈凸月';
        if (age < 15.8) return '满月';
        if (age < 21.1) return '亏凸月';
        if (age < 23.1) return '下弦月';
        return '残月';
    };
    // 亮面宽度 = 被照亮的比例 × 直径；上半月亮在右，下半月亮在左
    const paintMoonPhase = (el, age, size) => {
        const lit = (1 - Math.cos((2 * Math.PI * age) / SYNODIC)) / 2;
        const waxing = age < SYNODIC / 2;
        if (lit <= 0.5) {
            el.style.background = 'var(--ink-3)';
            el.style.boxShadow = `inset ${waxing ? '-' : ''}${(lit * size).toFixed(1)}px 0 0 0 var(--gold)`;
        } else {
            el.style.background = 'var(--gold)';
            el.style.boxShadow = `inset ${waxing ? '' : '-'}${((1 - lit) * size).toFixed(1)}px 0 0 0 var(--ink-3)`;
        }
    };

    // ------------------------------------------------------------
    // 月轮
    // ------------------------------------------------------------
    const ringDots = [];
    for (let k = 0; k < RING_DAYS; k++) {
        const angle = (-k * RING_STEP * Math.PI) / 180;
        const dot = document.createElement('span');
        dot.className = 'home-ring-dot';
        dot.style.left = `${(50 + RING_RADIUS * Math.sin(angle)).toFixed(2)}%`;
        dot.style.top = `${(50 - RING_RADIUS * Math.cos(angle)).toFixed(2)}%`;
        dot.style.setProperty('--i', String(k));
        ringEl.appendChild(dot);
        ringDots.push(dot);
    }

    let todayStatus = 'pending'; // pending | arrived | waiting
    let offset = 0;              // 0 = 今天，往回数第几天

    const refreshRing = () => {
        ringDots.forEach((dot, k) => {
            const d = addDays(today, -k);
            const hasLetter = k === 0 ? todayStatus !== 'waiting' : !!entryFor(d);
            const m = d.getMonth();
            const date = d.getDate();
            dot.classList.toggle('is-today', k === 0);
            dot.classList.toggle('is-empty', !hasLetter);
            dot.classList.toggle('is-special', k > 0 && ((m === 11 && date === 10) || (m === 8 && date === 22)));
            dot.classList.toggle('is-selected', k === offset);
        });
    };

    // ------------------------------------------------------------
    // 月洞窗里的画
    // ------------------------------------------------------------
    let artToken = 0;
    let artSrc = null;
    function showArt(src) {
        if (src === artSrc) return;
        artSrc = src;
        const token = ++artToken;
        if (!src) {
            moon.classList.remove('has-art', 'is-swapping');
            return;
        }
        if (moon.classList.contains('has-art')) moon.classList.add('is-swapping');
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
            if (token !== artToken) return;
            moon.style.setProperty('--art', `url("${img.src}")`);
            moon.classList.add('has-art');
            moon.classList.remove('is-swapping');
        };
        img.onerror = () => {
            if (token !== artToken) return;
            moon.classList.remove('has-art', 'is-swapping');
        };
        img.src = src;
    }

    // ------------------------------------------------------------
    // 文字与链接：跟着选中的那一天走
    // ------------------------------------------------------------
    const esc = window.Typeset ? window.Typeset.escapeHtml : (s) => s;
    const unit = (html) => `<span class="ts-u">${html}</span>`;
    const sep = '<span class="ts-sep"> · </span><wbr>';

    const STATUS = {
        arrived: { line: '今天的画信到了。', cta: '拆开今天的画信', label: '拆开今天的画信' },
        waiting: { line: '今天这封还在路上。', cta: '先看看昨天的', label: '今天这封还在路上，先看看昨天的' }
    };

    let currentHref = withPreview('gallery.html');

    function render() {
        const d = addDays(today, -offset);
        const md = `${d.getMonth() + 1}月${d.getDate()}日`;
        const n = Math.max(1, daysBetween(START, d) + 1);
        const isToday = offset === 0;
        const kind = todayStatus === 'waiting' ? 'waiting' : 'arrived';
        const entry = isToday ? (todayStatus === 'waiting' ? null : { filename: null }) : entryFor(d);

        refreshRing();

        // 画
        if (isToday) {
            if (todayStatus === 'arrived') showArt(todaySrc);
            else if (todayStatus === 'waiting') showArt(null);
        } else {
            showArt(entry ? `images/${entry.filename}` : null);
        }

        // 话
        if (isToday) {
            status.textContent = STATUS[kind].line;
        } else {
            // 日期在下一行，这句保持和"今天的画信到了。"一样短，桌面右栏放得下
            status.textContent = entry ? '这是那天的画信。' : '那天没有画信。';
        }
        meta.innerHTML = [
            unit(esc(md)),
            unit(esc(`星期${WEEKDAYS[d.getDay()]}`))
        ].join(sep) + `<span class="home-meta-days">${sep}${unit(`在一起的第 <span class="num">${n}</span> 天`)}</span>`;

        // 时间（桌面左栏）
        dayNumEl.textContent = String(n);
        let no = letterNo(d);
        // 今天的画已经传了、data.json 还没跟上（或缓存）时，序号先算上今天这封
        if (isToday && byDate && !byDate[todayIso] && todayStatus !== 'waiting') no += 1;
        letterLine.hidden = !entry || no < 1;
        letterNumEl.textContent = String(no);
        const age = moonAge(d);
        paintMoonPhase(moonPhaseEl, age, 12);
        moonNameEl.textContent = `${isToday ? '今晚' : '那晚'} · ${moonName(age)}`;

        // 去哪儿
        if (isToday) {
            currentHref = withPreview('gallery.html');
            ctaLabel.textContent = STATUS[kind].cta;
            moon.setAttribute('aria-label', STATUS[kind].label);
        } else if (entry) {
            currentHref = withPreview(`gallery.html?day=${isoOf(d)}`);
            ctaLabel.textContent = '拆开这一封';
            moon.setAttribute('aria-label', `拆开${md}的画信`);
        } else {
            currentHref = withPreview('gallery.html');
            ctaLabel.textContent = '去画廊看看';
            moon.setAttribute('aria-label', '去画廊看看');
        }
        moon.href = currentHref;
        cta.href = currentHref;

        // 转盘按钮
        body.classList.toggle('is-away', !isToday);
        backBtns.forEach((btn) => { btn.hidden = isToday; });
        prevBtn.disabled = offset >= RING_DAYS - 1;
        nextBtn.disabled = isToday;
    }

    function select(k, { haptic = false } = {}) {
        const next = Math.max(0, Math.min(RING_DAYS - 1, k));
        if (next === offset || body.classList.contains('is-opening')) return;
        offset = next;
        render();
        if (haptic && navigator.vibrate) navigator.vibrate(4);
    }

    prevBtn.addEventListener('click', () => select(offset + 1));
    nextBtn.addEventListener('click', () => select(offset - 1));
    backBtns.forEach((btn) => btn.addEventListener('click', () => select(0)));

    document.addEventListener('keydown', (event) => {
        if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
        if (body.classList.contains('d6k-active') || body.classList.contains('is-opening')) return;
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            select(offset + 1);
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            select(offset - 1);
        }
    });

    // 先藏起状态句，等知道今天的画到没到再显示，避免文案跳变
    status.classList.add('is-pending');
    render();

    // ------------------------------------------------------------
    // 今天的画：先按约定的文件名试着加载
    // ------------------------------------------------------------
    const settleToday = (kind) => {
        if (todayStatus !== 'pending') return;
        todayStatus = kind;
        status.classList.remove('is-pending');
        render();
    };
    const probe = new Image();
    probe.decoding = 'async';
    probe.onload = () => settleToday('arrived');
    probe.onerror = () => settleToday('waiting');
    probe.src = todaySrc;
    // 网速很慢时先按"到了"显示文案；真没有画，onerror 会再改成"还在路上"
    setTimeout(() => {
        if (todayStatus === 'pending') status.classList.remove('is-pending');
    }, 2500);

    loadData().then(render);

    // ------------------------------------------------------------
    // 转月轮：手指在星盘上转，按角度选中那一天（正上方是今天，逆时针往回）
    // ------------------------------------------------------------
    let drag = null;

    const pickFromPointer = (event) => {
        const r = disc.getBoundingClientRect();
        const dx = event.clientX - (r.left + r.width / 2);
        const dy = event.clientY - (r.top + r.height / 2);
        if (Math.hypot(dx, dy) < r.width * 0.2) return; // 太靠近中心，角度不稳
        const clockwise = (Math.atan2(dx, -dy) * 180) / Math.PI;
        const counter = (360 - clockwise) % 360;
        select(Math.round(counter / RING_STEP) % RING_DAYS, { haptic: true });
    };

    disc.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 || moon.contains(event.target) || body.classList.contains('is-opening')) return;
        const r = disc.getBoundingClientRect();
        const dist = Math.hypot(event.clientX - (r.left + r.width / 2), event.clientY - (r.top + r.height / 2));
        if (dist > r.width * 0.54) return; // 星盘外的角落不算
        drag = event.pointerId;
        try { disc.setPointerCapture(event.pointerId); } catch (err) { /* 老浏览器没有也能用 */ }
        body.classList.add('is-turning');
        pickFromPointer(event);
    });
    disc.addEventListener('pointermove', (event) => {
        if (drag === event.pointerId) pickFromPointer(event);
    });
    const endDrag = (event) => {
        if (drag !== event.pointerId) return;
        drag = null;
        body.classList.remove('is-turning');
    };
    disc.addEventListener('pointerup', endDrag);
    disc.addEventListener('pointercancel', endDrag);

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
    let animating = false;

    // 星盘坐标以星盘自身为参照，版面怎么挪都不会和月洞窗错位。
    // 今天（k = 0）不在花盘里，它是月轮正上方那颗。
    function layoutDisc() {
        const size = disc.clientWidth;
        const ratio = dpr();
        discCanvas.width = Math.round(size * ratio);
        discCanvas.height = Math.round(size * ratio);
        discCtx.setTransform(ratio, 0, 0, ratio, 0, 0);

        const c = size / 2;
        const outer = size / 2;
        const inner = size * SPIRAL_INNER;
        // 窗纸的朦胧度：认得出是哪幅画，又留一点"拆开"的余地
        moon.style.setProperty('--moon-blur', `${Math.max(2, Math.round(size / 120))}px`);

        const spacing = Math.sqrt((Math.PI * (outer * outer - inner * inner)) / dayNumber);
        const base = Math.max(0.42, spacing * 0.27);
        const rand = mulberry32(20091210);

        dots = new Array(dayNumber);
        for (let k = 1; k < dayNumber; k++) {
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
    }

    // 背景零星的星：避开星盘和外环所在的位置
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
            if (Math.hypot(x - cx, y - cy) < d.width * 0.58 + 14) continue;
            skyCtx.fillStyle = `rgba(236, 226, 255, ${alpha.toFixed(3)})`;
            skyCtx.beginPath();
            skyCtx.arc(x, y, size, 0, Math.PI * 2);
            skyCtx.fill();
        }
    }

    // 下标越大越早：从 hi 画到 lo（含两端，lo ≥ 1）
    function drawRange(hi, lo) {
        for (let k = hi; k >= lo; k--) {
            const p = dots[k];
            if (!p) continue;
            discCtx.fillStyle = p.color;
            discCtx.beginPath();
            discCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            discCtx.fill();
        }
    }

    function drawDisc() {
        discCtx.clearRect(0, 0, discCanvas.width, discCanvas.height);
        drawRange(dots.length - 1, 1);
    }

    const showRing = () => body.classList.add('ring-ready');

    // 入场：从最早那一天一路汇向今天，最后月轮亮起
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
            const target = Math.max(1, Math.round((dots.length - 1) * (1 - eased)));
            if (target <= next) {
                drawRange(next, target);
                next = target - 1;
            }
            if (p < 1) {
                requestAnimationFrame(step);
                return;
            }
            if (next >= 1) drawRange(next, 1);
            animating = false;
            showRing();
        };
        requestAnimationFrame(step);
    }

    // 尺寸变化（旋转屏幕、字体加载后版面微调）时整盘重画
    let lastSize = 0;
    const relayout = () => {
        drawSky();
        if (disc.clientWidth !== lastSize) {
            lastSize = disc.clientWidth;
            if (animating) showRing();
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
        showRing();
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
        const href = currentHref;
        if (reduceMotion) {
            window.location.href = href;
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
        setTimeout(() => { window.location.href = href; }, 680);
    }

    // ------------------------------------------------------------
    // 散雾：按住月洞窗，雾均匀散去、金线沿窗边走一圈，走完就拆开；
    // 中途松手雾回来；轻点一下直接拆开
    // ------------------------------------------------------------
    let hold = null;
    let suppressClick = false;
    const setHold = (p) => disc.style.setProperty('--hold', p.toFixed(3));

    moon.addEventListener('pointerdown', (event) => {
        if (reduceMotion || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
        if (body.classList.contains('is-opening')) return;
        event.stopPropagation(); // 不让星盘把它当成转月轮
        suppressClick = false;
        hold = { start: performance.now(), raf: 0 };
        try { moon.setPointerCapture(event.pointerId); } catch (err) { /* 老浏览器没有也能用 */ }
        body.classList.add('is-holding');
        const tick = (now) => {
            if (!hold) return;
            const p = Math.min(1, (now - hold.start) / HOLD_MS);
            setHold(p);
            if (p >= 1) {
                hold = null;
                openLetter();
                return;
            }
            hold.raf = requestAnimationFrame(tick);
        };
        hold.raf = requestAnimationFrame(tick);
    });

    const endHold = () => {
        if (!hold) return;
        cancelAnimationFrame(hold.raf);
        const held = performance.now() - hold.start;
        hold = null;
        body.classList.remove('is-holding');
        setHold(0); // 有过渡，雾慢慢回来
        if (held >= TAP_MS) suppressClick = true; // 按了一会儿又松手：只是看看，不拆
    };
    moon.addEventListener('pointerup', endHold);
    moon.addEventListener('pointercancel', endHold);
    moon.addEventListener('lostpointercapture', endHold);
    // 长按不弹出系统的链接菜单
    moon.addEventListener('contextmenu', (event) => event.preventDefault());

    moon.addEventListener('click', (event) => {
        if (suppressClick) {
            suppressClick = false;
            event.preventDefault();
            return;
        }
        openLetter(event);
    });
    cta.addEventListener('click', openLetter);

    // 从画廊返回时（浏览器可能直接还原页面），把放大的窗收回去
    window.addEventListener('pageshow', (event) => {
        if (!event.persisted) return;
        body.classList.remove('is-opening', 'is-holding', 'is-turning');
        moon.style.transform = '';
        setHold(0);
    });

    // ------------------------------------------------------------
    // 6000 天纪念页存档入口（2026-05-15 起常驻；?d6k 预览时也显示）
    // ------------------------------------------------------------
    if (utcDay(new Date()) >= utcDay(ARCHIVE_FROM) || params.has('d6k')) {
        document.querySelectorAll('.js-d6k').forEach((btn) => {
            btn.hidden = false;
            btn.addEventListener('click', () => {
                if (window.Day6000 && typeof window.Day6000.start === 'function') {
                    window.Day6000.cleanup?.();
                    setTimeout(() => {
                        window.Day6000.start({ id: 'day-6000', name: '6000 天纪念日', type: 'C', effect: 'day-6000' });
                    }, 80);
                    return;
                }
                window.location.href = 'index.html?d6k=1';
            });
        });
    }
})();
