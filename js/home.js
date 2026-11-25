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
    const { preference = matchMedia('(prefers-reduced-motion: reduce)'), enter = () => {} } = window.LoveMotion || {};

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

    body.classList.toggle('is-reduced', preference.matches);

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
    // 数据：哪些天有画信，以目录为准
    // ------------------------------------------------------------
    let byDate = null;
    let letterDates = [];
    let catalogReadAt = 0;

    const loadData = () => fetch('data.json', { cache: 'no-cache' })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`data.json ${res.status}`))))
        .then((list) => {
            if (!Array.isArray(list)) throw new Error('Invalid catalog');
            byDate = {};
            list.forEach((item) => {
                if (item && /^\d{4}-\d{2}-\d{2}$/.test(item.date) && item.filename) byDate[item.date] = item;
            });
            letterDates = Object.keys(byDate).sort();
            catalogReadAt = Date.now();
            catalogState = 'ready';
        })
        .catch(() => {
            byDate = null;
            catalogState = 'error';
        });

    const entryFor = (d) => byDate?.[isoOf(d)] || null;
    const letterNo = (d) => {
        const day = isoOf(d);
        return letterDates.filter(key => key <= day).length;
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

    let catalogState = 'loading';
    const retry = document.getElementById('home-retry');
    const failedCaption = document.getElementById('home-image-caption');
    let offset = 0;              // 0 = 今天，往回数第几天

    const refreshRing = () => {
        ringDots.forEach((dot, k) => {
            const d = addDays(today, -k);
            const hasLetter = !!entryFor(d);
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
    // 画的宽高比记在这台设备上（与画廊共用）：画廊打开时画还没下载完，也能先按真比例排好画框
    const RATIO_KEY = 'love-minnie-ratios-v1';
    function rememberRatio(filename, ratio) {
        try {
            const stored = JSON.parse(localStorage.getItem(RATIO_KEY) || '{}') || {};
            const value = Number(ratio.toFixed(4));
            if (stored[filename] === value) return;
            stored[filename] = value;
            localStorage.setItem(RATIO_KEY, JSON.stringify(stored));
        } catch (err) {
            // 隐私模式存不下也没关系
        }
    }

    let artToken = 0;
    let artSrc = null;
    const artLayers = [...moon.querySelectorAll('.home-moon-art')];
    let front = 0;

    function showArt(src) {
        if (src === artSrc) return;
        artSrc = src;
        failedCaption.hidden = true;
        retry.hidden = true;
        const token = ++artToken;
        delete moon.dataset.date;
        moon.setAttribute('aria-busy', String(!!src));
        if (!src) {
            moon.classList.remove('has-art', 'is-swapping');
            return;
        }
        moon.classList.toggle('is-swapping', moon.classList.contains('has-art'));
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
            if (token !== artToken) return;
            rememberRatio(src.split('/').pop(), img.naturalWidth / img.naturalHeight);
            const art = `url("${img.src}")`;
            const next = 1 - front;
            artLayers[next].style.backgroundImage = art;
            artLayers[next].classList.add('is-current');
            artLayers[front].classList.remove('is-current');
            front = next;
            moon.style.setProperty('--art', art);
            moon.dataset.date = isoOf(addDays(today, -offset));
            moon.classList.add('has-art');
            moon.classList.remove('is-swapping');
            moon.setAttribute('aria-busy', 'false');
        };
        img.onerror = () => {
            if (token !== artToken) return;
            moon.classList.remove('has-art', 'is-swapping');
            moon.setAttribute('aria-busy', 'false');
            failedCaption.textContent = entryFor(addDays(today, -offset))?.loveLetter || '';
            failedCaption.hidden = !failedCaption.textContent;
            retry.textContent = '重新加载图片';
            retry.hidden = false;
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
        arrived: { line: '今天的画信到了。', cta: '拆开今天的画信' },
        waiting: { line: '今天这封还在路上。' }
    };

    let currentHref = withPreview('gallery.html');

    // 天数一位一格：第一次打开时从下面逐位升上来；转月轮时只有变了的那几位滚一下，
    // 往回转从上面落下、往前转从下面升起。读屏读的是整数，不是一个个数字
    let shownDays = 0;
    function setDayNum(n) {
        const str = String(n);
        const cells = dayNumEl.querySelectorAll('.hd-in');
        if (cells.length !== str.length) {
            dayNumEl.innerHTML = `<span class="home-sr">${str}</span>` + [...str].map(ch =>
                `<span class="hd" aria-hidden="true"><span class="hd-in">${ch}</span></span>`).join('');
        } else if (n !== shownDays) {
            const direction = n < shownDays ? -1 : 1;
            dayNumEl.querySelector('.home-sr').textContent = str;
            cells.forEach((cell, k) => {
                if (cell.textContent === str[k]) return;
                cell.textContent = str[k];
                if (!body.classList.contains('is-turning')) enter(cell, 0, direction * 6);
            });
        }
        shownDays = n;
    }

    function render(ringChanged = true) {
        const d = addDays(today, -offset);
        const md = `${d.getMonth() + 1}月${d.getDate()}日`;
        const n = Math.max(1, daysBetween(START, d) + 1);
        const isToday = offset === 0;
        const entry = entryFor(d);
        const kind = entry ? 'arrived' : 'waiting';
        if (ringChanged !== false) refreshRing();
        showArt(entry ? `images/${entry.filename}` : null);
        if (catalogState === 'error') {
            status.textContent = '画信目录暂时没打开。';
            retry.textContent = '重新加载目录';
            retry.hidden = false;
        } else if (catalogState === 'loading') {
            status.textContent = '正在翻开画信。';
        } else {
            status.textContent = isToday ? STATUS[kind].line : (entry ? '这是那天的画信。' : '那天没有画信。');
        }
        meta.innerHTML = [
            unit(esc(md)),
            unit(esc(`星期${WEEKDAYS[d.getDay()]}`))
        ].join(sep) + `<span class="home-meta-days">${sep}${unit(`在一起的第 <span class="num">${n}</span> 天`)}</span>`;

        // 时间（桌面左栏）
        setDayNum(n);
        const no = letterNo(d);
        letterLine.hidden = !entry || no < 1;
        letterNumEl.textContent = String(no);
        const age = moonAge(d);
        paintMoonPhase(moonPhaseEl, age, 12);
        moonNameEl.textContent = `${isToday ? '今晚' : '那晚'} · ${moonName(age)}`;

        // 去哪儿
        if (catalogState !== 'ready') {
            currentHref = withPreview('gallery.html');
            ctaLabel.textContent = '去画廊看看';
            moon.setAttribute('aria-label', '去画廊看看');
        } else if (isToday) {
            currentHref = withPreview('gallery.html');
            const last = letterDates[no - 1];
            const fallback = !last ? '去画廊看看' : last === isoOf(addDays(d, -1)) ? '先看看昨天的' : '先读最近一封';
            ctaLabel.textContent = entry ? STATUS.arrived.cta : fallback;
            moon.setAttribute('aria-label', ctaLabel.textContent);
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
        if (next === offset) return;
        ringDots[offset].classList.remove('is-selected');
        ringDots[next].classList.add('is-selected');
        offset = next;
        render(false);
        if (haptic && navigator.vibrate) navigator.vibrate(4);
    }

    prevBtn.addEventListener('click', () => select(offset + 1));
    nextBtn.addEventListener('click', () => select(offset - 1));
    backBtns.forEach((btn) => btn.addEventListener('click', () => select(0)));

    document.addEventListener('keydown', (event) => {
        if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
        if (body.classList.contains('d6k-active')) return;
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            select(offset + 1);
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            select(offset - 1);
        }
    });

    retry.addEventListener('click', () => {
        retry.hidden = true;
        if (catalogState === 'error') {
            catalogState = 'loading';
            render();
            loadData().then(render);
        } else {
            const src = artSrc;
            artSrc = null;
            showArt(src);
        }
    });
    render();
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
        if (!event.isPrimary || event.button !== 0 || moon.contains(event.target)) return;
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
    disc.addEventListener('lostpointercapture', endDrag);

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

    // 星点从最早那一天汇向今天。月轮从第一帧就能转动。
    function animateDisc() {
        animating = true;
        discCtx.clearRect(0, 0, discCanvas.width, discCanvas.height);
        const duration = 360;
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
    // 画信和月轮立即可用，字体就绪后只校正星空的位置。
    lastSize = disc.clientWidth;
    layoutDisc();
    drawSky();
    if (preference.matches) drawDisc();
    else animateDisc();
    requestAnimationFrame(() => body.classList.add('is-ready'));
    document.fonts?.ready.then(drawSky);

    function openLetter(event) {
        if (event && (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.button === 1)) return;
        if (event) event.preventDefault();
        const to = new URL(currentHref, location.href).href;
        if (byDate && Date.now() - catalogReadAt < 30000) {
            try {
                sessionStorage.setItem('lm-catalog-transfer', JSON.stringify({
                    at: Date.now(), to, rows: Object.values(byDate)
                }));
            } catch { /* 无法暂存时画廊自行读取目录。 */ }
        }
        location.assign(to);
    }

    // ------------------------------------------------------------
    // 散雾：按住月洞窗，雾均匀散去、金线沿窗边走一圈，走完就拆开；
    // 中途松手雾回来；轻点一下直接拆开
    // ------------------------------------------------------------
    let hold = null;
    let suppressClick = false;
    const setHold = (p) => disc.style.setProperty('--hold', p.toFixed(3));

    moon.addEventListener('pointerdown', (event) => {
        if (preference.matches || !event.isPrimary || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
        event.stopPropagation(); // 不让星盘把它当成转月轮
        suppressClick = false;
        hold = { pointer: event.pointerId, start: performance.now(), raf: 0 };
        try { moon.setPointerCapture(event.pointerId); } catch (err) { /* 老浏览器没有也能用 */ }
        body.classList.add('is-holding');
        const tick = (now) => {
            if (!hold) return;
            const p = Math.min(1, (now - hold.start) / HOLD_MS);
            setHold(p);
            if (p >= 1) {
                hold = null;
                suppressClick = true;
                openLetter();
                return;
            }
            hold.raf = requestAnimationFrame(tick);
        };
        hold.raf = requestAnimationFrame(tick);
    });

    const endHold = (event) => {
        if (!hold || (event && hold.pointer !== event.pointerId)) return;
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

    function resetGesture() {
        endHold();
        drag = null;
        suppressClick = false;
        body.classList.remove('is-holding', 'is-turning');
        setHold(0);
    }
    window.addEventListener('pagehide', resetGesture);
    preference.addEventListener('change', () => {
        body.classList.toggle('is-reduced', preference.matches);
        resetGesture();
        if (preference.matches && animating) {
            animating = false;
            drawDisc();
        }
    });

    // ------------------------------------------------------------
    // 6000 天纪念页存档入口（2026-05-15 起常驻；?d6k 预览时也显示）
    // ------------------------------------------------------------
    if (utcDay(new Date()) >= utcDay(ARCHIVE_FROM) || params.has('d6k')) {
        document.querySelectorAll('.js-d6k').forEach((btn) => {
            btn.hidden = false;
            btn.addEventListener('click', () => {
                if (window.Day6000 && typeof window.Day6000.start === 'function') {
                    window.Day6000.start({ id: 'day-6000', name: '6000 天纪念日', type: 'C', effect: 'day-6000' });
                    return;
                }
                window.location.href = 'index.html?d6k=1';
            });
        });
    }
})();
