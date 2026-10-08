/**
 * Love Minnie · 画廊（2026-10 星夜园林）
 *
 * 三个视图：
 * - 今日：今日画信（细金框的画 + 一封有邮戳、落款和印章的信）+ 这个月的月相尺；
 * - 长廊：所有画信从今天往回排成一条横向长廊，每个月开头竖排月份，桌面滚轮横着走；
 * - 画历：一个月的圆窗，每天一扇，"今天"那一格是当季的窗形。
 * 共用：看画弹窗（展签、邮戳、印章）、看画时底部的胶卷条、四季面板。
 *
 * URL：#today / #corridor / #calendar 切换视图；
 *      ?day=YYYY-MM-DD 直接打开某一封（首页月轮点开就是这个）；
 *      ?date=YYYY-MM-DD 把"今天"换成指定日期预览（与首页一致）；
 *      ?lmdev=1 暴露排版自检钩子 window.__LM。
 */
document.addEventListener('DOMContentLoaded', () => {
    const $ = (id) => document.getElementById(id);
    const params = new URLSearchParams(window.location.search);
    const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ============================================================
    // DOM
    // ============================================================
    const bgBlur = $('bg-blur');
    const heroEl = $('today-hero');
    const emptyState = $('empty-state');

    const corridorScroll = $('corridor-scroll');
    const corridorMonths = $('corridor-months');
    const corridorRange = $('corridor-range');
    const corridorMarks = $('corridor-marks');

    const calGrid = $('cal-grid');
    const calPrev = $('cal-prev');
    const calNext = $('cal-next');

    const timelineContainer = $('timeline-container');

    const detailModal = $('detail-modal');
    const detailImage = $('detail-image');
    const detailTitle = $('detail-title');
    const detailDate = $('detail-date');
    const detailDescription = $('detail-description');
    const detailLetter = $('detail-letter');
    const detailClose = $('detail-close');

    const seasonBtn = $('season-btn');
    const seasonSheet = $('season-sheet');
    const seasonOverlay = $('season-overlay');
    const seasonOptions = $('season-options');

    // ============================================================
    // 跟随鼠标的柔光（仅桌面，鼠标本身保持系统光标）
    // ============================================================
    const torch = $('torch');
    if (torch) {
        const moveCursor = (x, y) => {
            torch.style.left = `${x}px`;
            torch.style.top = `${y}px`;
        };
        moveCursor(window.innerWidth / 2, window.innerHeight / 2);
        document.addEventListener('mousemove', (e) => moveCursor(e.clientX, e.clientY));
    }

    const setTorchMode = (isActive) => {
        if (!torch) return;
        const size = isActive ? '600px' : '400px';
        torch.style.width = size;
        torch.style.height = size;
        torch.style.background = isActive
            ? 'radial-gradient(circle, var(--torch-active-strong) 0%, var(--torch-active-soft) 50%, transparent 70%)'
            : 'radial-gradient(circle, var(--torch-idle-strong) 0%, var(--torch-idle-soft) 50%, transparent 70%)';
    };

    // ============================================================
    // 日期与数据
    // ============================================================
    const RELATIONSHIP_START = new Date('2009-12-10T00:00:00');
    const WEEKDAYS_ZH = '日一二三四五六';
    const MONTH_CN = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    const MONTH_EN = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    const TS = window.Typeset;

    // "今天"：默认取本机日期；URL 加 ?date=YYYY-MM-DD 可预览指定日期的画廊（与首页一致）
    const PREVIEW_DATE = (() => {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(params.get('date') || '');
        return match ? new Date(+match[1], +match[2] - 1, +match[3]) : null;
    })();
    const getToday = () => {
        const d = PREVIEW_DATE ? new Date(PREVIEW_DATE) : new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    };
    const isMobileLayout = () => window.matchMedia('(max-width: 600px)').matches;

    const pad2 = (n) => String(n).padStart(2, '0');
    const formatDateISO = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
    const toUtcDay = (date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = (start, end) => Math.floor((toUtcDay(end) - toUtcDay(start)) / 86400000);
    const getDayNumber = (date) => diffDays(RELATIONSHIP_START, date) + 1;
    const parseISO = (iso) => {
        const [y, m, d] = iso.split('-').map(Number);
        return new Date(y, m - 1, d);
    };

    const escapeHtml = (text) => String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    // 首页链接带上预览日期
    const homeHref = PREVIEW_DATE ? `index.html?date=${formatDateISO(PREVIEW_DATE)}` : 'index.html';
    ['lm-home-link', 'nav-home'].forEach((id) => {
        const el = $(id);
        if (el) el.href = homeHref;
    });

    // 只展示"今天"及以前的画信（预览旧日期时也一样）
    let galleryData = [];   // 新 → 旧
    let dataByDate = {};
    let sortedDates = [];   // 旧 → 新
    let chronoIndex = new Map();
    let selectedDate = getToday();

    const getChronoNo = (item) => chronoIndex.get(item.date) || 0;

    function getArtworkThemeText(item) {
        const raw = String(item.loveLetter || item.title || item.description || '');
        const match = raw.match(/今日份爱你[,，、\s]*(.+)$/);
        if (match) return match[1].trim();
        return raw.replace(/^♥️\s*/, '').trim();
    }

    function getArtworkLabel(item) {
        const d = item.dateObj;
        const dateLabel = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
        const theme = getArtworkThemeText(item);
        return theme ? `${dateLabel}，${theme}` : dateLabel;
    }

    // 特别的日子：画历的描边、长廊的小标签
    const SPECIAL_DAYS = [
        { md: '09-22', name: '老婆生日', short: '生日', love: true },
        { md: '10-03', name: '婚礼纪念日', short: '婚礼纪念日' },
        { md: '12-10', name: '恋爱纪念日', short: '恋爱纪念日', love: true },
        { md: '12-16', name: '领证纪念日', short: '领证纪念日' },
        { date: '2026-05-14', name: '在一起 6000 天', short: '6000 天' },
        { date: '2025-12-24', name: '第一封画信', short: '第一封' }
    ];
    const specialFor = (iso) => SPECIAL_DAYS.find((s) => (s.date ? s.date === iso : iso.slice(5) === s.md)) || null;

    // ============================================================
    // 背景：今天那幅画的色调
    // ============================================================
    const bgToneCache = new Map();
    let bgToneRequestId = 0;
    let baseTint = null;
    const toneCanvas = document.createElement('canvas');
    const toneCtx = toneCanvas.getContext('2d', { willReadFrequently: true });
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const parseHexColor = (value) => {
        if (!value) return null;
        const hex = value.trim();
        if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return null;
        const normalized = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
        const int = Number.parseInt(normalized.slice(1), 16);
        return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
    };
    const mixColor = (a, b, ratio) => ({
        r: Math.round(a.r * (1 - ratio) + b.r * ratio),
        g: Math.round(a.g * (1 - ratio) + b.g * ratio),
        b: Math.round(a.b * (1 - ratio) + b.b * ratio)
    });
    const toRgba = (color, alpha) => `rgba(${color.r}, ${color.g}, ${color.b}, ${clamp(alpha, 0, 1)})`;
    const getBaseTint = () => {
        if (!baseTint) {
            const cssValue = getComputedStyle(document.documentElement).getPropertyValue('--bg-color');
            baseTint = parseHexColor(cssValue) || { r: 21, g: 13, b: 33 };
        }
        return baseTint;
    };
    const setBgBlurOverlay = (tone) => {
        if (!bgBlur || !tone) return;
        const base = getBaseTint();
        const toned = mixColor(tone, base, 0.55);
        bgBlur.style.setProperty(
            '--bg-blur-overlay',
            `radial-gradient(circle at 20% 20%, ${toRgba(toned, 0.45)} 0%, ${toRgba(toned, 0.25)} 45%, ${toRgba(base, 0.9)} 78%)`
        );
    };
    const extractToneFromImage = (img) => {
        if (!toneCtx) return null;
        const size = 40;
        toneCanvas.width = size;
        toneCanvas.height = size;
        toneCtx.clearRect(0, 0, size, size);
        toneCtx.drawImage(img, 0, 0, size, size);
        const { data } = toneCtx.getImageData(0, 0, size, size);
        let r = 0;
        let g = 0;
        let b = 0;
        let total = 0;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 40) continue;
            const red = data[i];
            const green = data[i + 1];
            const blue = data[i + 2];
            const luma = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
            const saturation = (Math.max(red, green, blue) - Math.min(red, green, blue)) / 255;
            const weight = Math.max(0.1, 1 - Math.abs(luma - 128) / 128) * (0.4 + saturation);
            r += red * weight;
            g += green * weight;
            b += blue * weight;
            total += weight;
        }
        return total ? { r: Math.round(r / total), g: Math.round(g / total), b: Math.round(b / total) } : null;
    };
    function applyImageTone(filename) {
        if (!bgBlur || !filename) return;
        bgBlur.style.setProperty('--bg-blur-image', `url('../images/${filename}')`);
        const cached = bgToneCache.get(filename);
        if (cached) {
            setBgBlurOverlay(cached);
            return;
        }
        const requestId = ++bgToneRequestId;
        const img = new Image();
        img.decoding = 'async';
        img.src = `images/${filename}`;
        img.onload = () => {
            if (requestId !== bgToneRequestId) return;
            const tone = extractToneFromImage(img);
            if (tone) bgToneCache.set(filename, tone);
            setBgBlurOverlay(tone || getBaseTint());
        };
        img.onerror = () => {
            if (requestId === bgToneRequestId) setBgBlurOverlay(getBaseTint());
        };
    }

    // ============================================================
    // 四季：季节只换花，不换夜（与首页共用同一个存储键）
    // ============================================================
    const THEME_STORAGE_KEY = 'love-minnie-theme-v3';
    const SEASONS = {
        spring: { name: '春', flower: '海棠', window: '海棠窗', months: '3—5 月' },
        summer: { name: '夏', flower: '荷', window: '扇面窗', months: '6—8 月' },
        autumn: { name: '秋', flower: '桂', window: '八角窗', months: '9—11 月' },
        winter: { name: '冬', flower: '梅', window: '梅花窗', months: '12—2 月' }
    };
    const SEASON_CHOICES = ['auto', 'spring', 'summer', 'autumn', 'winter'];

    const getSeasonalTheme = () => {
        const month = getToday().getMonth();
        if (month >= 2 && month <= 4) return 'spring';
        if (month >= 5 && month <= 7) return 'summer';
        if (month >= 8 && month <= 10) return 'autumn';
        return 'winter';
    };
    const readSeasonChoice = () => {
        try {
            const stored = localStorage.getItem(THEME_STORAGE_KEY);
            return SEASONS[stored] ? stored : 'auto';
        } catch (err) {
            return 'auto';
        }
    };
    let seasonChoice = readSeasonChoice();

    function renderSeasonOptions() {
        const now = SEASONS[getSeasonalTheme()];
        seasonOptions.innerHTML = SEASON_CHOICES.map((key) => {
            const checked = key === seasonChoice;
            if (key === 'auto') {
                return `<button type="button" class="season-opt" role="radio" data-season="auto" aria-checked="${checked}">` +
                    '<span class="season-win" aria-hidden="true"></span>' +
                    '<span><span class="season-name">跟着日期</span><br>' +
                    `<span class="season-when">现在是${now.name}天 · ${now.flower}</span></span></button>`;
            }
            const s = SEASONS[key];
            return `<button type="button" class="season-opt" role="radio" data-season="${key}" aria-checked="${checked}">` +
                '<span class="season-win" aria-hidden="true"></span>' +
                `<span class="season-name">${s.name} · ${s.flower}</span>` +
                `<span class="season-when">${s.window} · <span class="num">${s.months}</span></span></button>`;
        }).join('');
    }

    function applySeason(choice, { persist = true } = {}) {
        seasonChoice = SEASON_CHOICES.includes(choice) ? choice : 'auto';
        const theme = seasonChoice === 'auto' ? getSeasonalTheme() : seasonChoice;
        document.documentElement.dataset.theme = theme;
        if (persist) {
            try {
                if (seasonChoice === 'auto') localStorage.removeItem(THEME_STORAGE_KEY);
                else localStorage.setItem(THEME_STORAGE_KEY, seasonChoice);
            } catch (err) {
                // 隐私模式存不下也没关系
            }
        }
        const s = SEASONS[theme];
        seasonBtn.querySelector('use').setAttribute('href', `#i-${theme}`);
        $('season-label').textContent = `${s.name} · ${s.flower}`;
        seasonBtn.setAttribute('aria-label', `季节：${s.name}，${s.flower}。点开换季节`);
        seasonOptions.querySelectorAll('.season-opt').forEach((btn) => {
            btn.setAttribute('aria-checked', String(btn.dataset.season === seasonChoice));
        });
        baseTint = null;
        const item = dataByDate[formatDateISO(selectedDate)];
        if (item) applyImageTone(item.filename);
    }

    let seasonReturnFocus = null;
    function openSeasonSheet() {
        seasonReturnFocus = document.activeElement;
        renderSeasonOptions();
        seasonSheet.classList.add('open');
        seasonSheet.setAttribute('aria-hidden', 'false');
        seasonOverlay.classList.add('show');
        seasonBtn.setAttribute('aria-expanded', 'true');
        const current = seasonOptions.querySelector('[aria-checked="true"]') || seasonOptions.querySelector('.season-opt');
        requestAnimationFrame(() => current?.focus());
    }
    function closeSeasonSheet() {
        if (!seasonSheet.classList.contains('open')) return;
        seasonSheet.classList.remove('open');
        seasonSheet.setAttribute('aria-hidden', 'true');
        seasonOverlay.classList.remove('show');
        seasonBtn.setAttribute('aria-expanded', 'false');
        (seasonReturnFocus && document.contains(seasonReturnFocus) ? seasonReturnFocus : seasonBtn).focus();
    }

    seasonBtn.addEventListener('click', openSeasonSheet);
    $('season-close').addEventListener('click', closeSeasonSheet);
    seasonOverlay.addEventListener('click', closeSeasonSheet);
    seasonOptions.addEventListener('click', (e) => {
        const btn = e.target.closest('.season-opt');
        if (!btn) return;
        applySeason(btn.dataset.season);
        setTimeout(closeSeasonSheet, 260);
    });
    seasonSheet.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            closeSeasonSheet();
            return;
        }
        if (e.key === 'Tab') {
            const focusable = [...seasonSheet.querySelectorAll('button')];
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });

    renderSeasonOptions();
    applySeason(seasonChoice, { persist: false });

    // ============================================================
    // 文字排版小工具：日期、数字、短语整体换行（见 js/typeset.js）
    // ============================================================
    const SEP = '<span class="ts-sep"> · </span><wbr>';
    const HEART_SVG = '<svg class="icon" aria-hidden="true"><use href="#i-heart"></use></svg>';
    const unit = (html) => `<span class="ts-u">${html}</span>`;

    // 画信文字 → 主题（标题）、是否长句、有没有"今日份爱你"、以及后面多出来的段落
    function letterParts(item) {
        const raw = item.loveLetter || item.description || '';
        const { theme, ritual, rest } = TS.parseLetter(raw);
        const title = theme || (ritual ? '今日份爱你' : '');
        const isLong = Array.from(title.replace(/\s/g, '')).length > 16;
        return { title, isLong, ritual: ritual && !!theme, rest };
    }

    const signHtml = (parts) => HEART_SVG + (parts.ritual ? unit('今日份爱你') : '');

    // ------------------------------------------------------------
    // 邮戳、月相、印章：今日画信、长廊、画历和看画共用
    // ------------------------------------------------------------
    let postmarkSeq = 0;
    function postmarkSvg(d, no, dayNo) {
        const id = `lm-pm-${++postmarkSeq}`;
        const ring = `LOVE MINNIE · ${d.getFullYear()} · ${pad2(d.getMonth() + 1)} · ${pad2(d.getDate())} · NO. ${no} ·`;
        return '<svg viewBox="0 0 112 112" aria-hidden="true" focusable="false">' +
            `<defs><path id="${id}" d="M56,56 m-44.5,0 a44.5,44.5 0 1,1 89,0 a44.5,44.5 0 1,1 -89,0"/></defs>` +
            '<circle cx="56" cy="56" r="52" fill="#f4eadf" stroke="#b4455d" stroke-width="1.6"/>' +
            '<circle cx="56" cy="56" r="37" fill="none" stroke="#b4455d" stroke-width="1"/>' +
            `<text font-family="Bodoni Moda, serif" font-size="8.5" letter-spacing="2" fill="#b4455d"><textPath href="#${id}" textLength="272" lengthAdjust="spacing">${ring}</textPath></text>` +
            `<text x="56" y="61" text-anchor="middle" font-family="Bodoni Moda, serif" font-size="22" fill="#b4455d">${dayNo}</text>` +
            '<text x="56" y="73" text-anchor="middle" font-family="Bodoni Moda, serif" font-size="6.5" letter-spacing="2" fill="#b4455d">DAYS</text>' +
            '</svg>';
    }

    // 月相：按月龄估算被照亮的比例；上半月亮在右，下半月亮在左
    const SYNODIC = 29.530588853;
    const NEW_MOON_REF = Date.UTC(2000, 0, 6, 18, 14);
    function moonLit(date) {
        const days = (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12) - NEW_MOON_REF) / 86400000;
        const age = ((days % SYNODIC) + SYNODIC) % SYNODIC;
        return { lit: (1 - Math.cos((2 * Math.PI * age) / SYNODIC)) / 2, waxing: age < SYNODIC / 2 };
    }
    function moonStyle(phase, size) {
        const { lit, waxing } = phase;
        if (lit <= 0.5) {
            return { bg: 'var(--night-3)', shadow: `inset ${waxing ? '-' : ''}${(lit * size).toFixed(1)}px 0 0 0 var(--ink-gold)` };
        }
        return { bg: 'var(--ink-gold)', shadow: `inset ${waxing ? '' : '-'}${((1 - lit) * size).toFixed(1)}px 0 0 0 var(--night-3)` };
    }
    // 一个月里最圆的那天
    function fullMoonDay(y, m) {
        const daysIn = new Date(y, m + 1, 0).getDate();
        let best = 1;
        let bestLit = -1;
        for (let day = 1; day <= daysIn; day++) {
            const { lit } = moonLit(new Date(y, m, day));
            if (lit > bestLit) {
                bestLit = lit;
                best = day;
            }
        }
        return best;
    }

    // 印章：同一封信只盖一次（记在这台设备上），第二次打开时它已经在那儿了
    const STAMP_KEY = 'love-minnie-stamped-v1';
    function maybeStamp(seal, date) {
        if (!seal) return;
        seal.classList.remove('is-stamping');
        let stamped = [];
        try {
            stamped = JSON.parse(localStorage.getItem(STAMP_KEY) || '[]');
        } catch (err) {
            stamped = [];
        }
        if (!Array.isArray(stamped) || stamped.includes(date)) return;
        void seal.offsetWidth; // 重新触发动画
        seal.classList.add('is-stamping');
        stamped.push(date);
        try {
            localStorage.setItem(STAMP_KEY, JSON.stringify(stamped.slice(-120)));
        } catch (err) {
            // 隐私模式存不下也没关系，最多下次再盖一次
        }
    }

    // 打开某一封：选中它，再打开看画
    function openItem(item) {
        if (!item) return;
        selectDate(item.dateObj);
        openDetail(item);
    }

    // ============================================================
    // 今日画信
    // 横图竖图同一套版式，只按画的比例分配空间：
    //   宽卡片：画在左、信在右；窄卡片（手机、平板竖屏）：画在上、信在下。
    // 今天的画还没上时，展示最近一封，并注明"今天这封还在路上"。
    // ============================================================
    function getHeroPick() {
        const todayItem = dataByDate[formatDateISO(getToday())];
        if (todayItem) return { item: todayItem, isToday: true };
        return galleryData.length ? { item: galleryData[0], isToday: false } : null;
    }

    function layoutHero() {
        const img = $('today-hero-img');
        if (!heroEl || heroEl.hidden || !img || heroEl.offsetParent === null) return;
        // 画还没加载完（手机网慢）时先按 4:3 占位，把上下 / 左右版式先定下来；加载完再按真实比例重算
        const known = img.naturalWidth > 0;
        const ratio = known ? img.naturalWidth / img.naturalHeight : 4 / 3;
        const portrait = ratio < 0.95;
        heroEl.classList.toggle('is-portrait', known && portrait);
        heroEl.classList.toggle('is-landscape', known && !portrait);

        // 宽卡片：画在左，信纸一栏 367px（再压住画框衬边 13px，不压画）；窄卡片：画在上、信在下
        const heroWidth = heroEl.clientWidth;
        const stacked = heroWidth < 820;
        heroEl.classList.toggle('is-stacked', stacked);
        const vh = window.innerHeight;
        let artW;
        if (stacked) {
            const maxW = heroWidth - 14;
            const maxH = portrait ? Math.min(vh * 0.56, 560) : vh * 0.5;
            artW = Math.min(maxW, maxH * ratio);
        } else {
            const availW = heroWidth - 367 - 26;
            const maxH = portrait
                ? Math.min(Math.max(vh - 240, 440), 760)
                : Math.min(Math.max(vh - 330, 320), 600);
            artW = Math.min(availW, maxH * ratio);
        }
        artW = Math.max(120, Math.floor(artW));
        heroEl.style.setProperty('--art-w', `${artW}px`);
        heroEl.style.setProperty('--art-h', `${Math.round(artW / ratio)}px`);

        const titleEl = $('today-hero-title');
        if (titleEl && !titleEl.classList.contains('is-long')) {
            const chars = Array.from(titleEl.textContent.replace(/\s/g, '')).length;
            TS.fit(titleEl, {
                max: stacked ? (isMobileLayout() ? 40 : 46) : 56,
                min: stacked ? 24 : 28,
                maxLines: chars <= 8 ? 1 : 2
            });
        }
    }

    // 月相尺：这个月每天的真实月相；有画信的日子是按钮，点开就是那一封
    function renderHeroRuler(current) {
        const ruler = $('today-hero-ruler');
        if (!ruler) return;
        const y = current.dateObj.getFullYear();
        const m = current.dateObj.getMonth();
        const daysIn = new Date(y, m + 1, 0).getDate();
        const todayStr = formatDateISO(getToday());
        const fullDay = fullMoonDay(y, m);
        let count = 0;
        const cells = [];
        for (let day = 1; day <= daysIn; day++) {
            const iso = `${y}-${pad2(m + 1)}-${pad2(day)}`;
            const item = dataByDate[iso] || null;
            if (item) count++;
            const isToday = iso === todayStr;
            const moon = moonStyle(moonLit(new Date(y, m, day)), 13);
            const shadow = isToday ? `${moon.shadow}, 0 0 0 3px var(--bg-color), 0 0 0 4px var(--ink-gold)` : moon.shadow;
            const cls = ['ruler-day'];
            if (item) cls.push('has-letter');
            if (iso > todayStr) cls.push('is-future');
            if (iso === current.date) cls.push('is-current');
            const mark = day === fullDay ? '望' : (isToday ? '今' : '');
            const inner =
                `<span class="ruler-mark" aria-hidden="true">${mark}</span>` +
                `<span class="ruler-moon" aria-hidden="true" style="background:${moon.bg};box-shadow:${shadow}"></span>` +
                `<span class="ruler-num">${day}</span>` +
                '<span class="ruler-dot" aria-hidden="true"></span>';
            if (!item) {
                cells.push(`<span class="${cls.join(' ')}">${inner}</span>`);
                continue;
            }
            const label = escapeHtml(`${m + 1}月${day}日，${letterParts(item).title || '画信'}`);
            cells.push(`<button type="button" class="${cls.join(' ')}" data-date="${iso}" aria-label="${label}">${inner}</button>`);
        }
        ruler.innerHTML =
            '<div class="hero-ruler-head">' +
            `<span>${MONTH_CN[m]} · <span class="num">${y}</span></span>` +
            `<span class="ruler-sum">已收到 <span class="num">${count}</span> 封 · 满月在 <span class="num">${m + 1}.${fullDay}</span></span>` +
            '</div>' +
            `<div class="hero-ruler-days">${cells.join('')}</div>`;
        // 手机上月相尺横向滚动：把这一封挪到看得见的位置
        const cur = ruler.querySelector('.is-current');
        const strip = ruler.querySelector('.hero-ruler-days');
        if (cur && strip && strip.scrollWidth > strip.clientWidth) {
            strip.scrollLeft = Math.max(0, cur.offsetLeft - strip.clientWidth / 2);
        }
    }

    function renderTodayHero(forcedPick) {
        if (!heroEl) return null;
        const pick = forcedPick || getHeroPick();
        if (!pick) {
            heroEl.hidden = true;
            return null;
        }

        const { item, isToday } = pick;
        const d = item.dateObj;
        const daysAgo = diffDays(d, getToday());
        const label = isToday ? '今天' : (daysAgo === 1 ? '昨天' : '最近一封');
        const no = getChronoNo(item);
        const dayNo = getDayNumber(d);

        $('today-hero-postmark').innerHTML = postmarkSvg(d, no, dayNo);
        $('today-hero-no').innerHTML = unit(`第 <span class="num">${no}</span> 封画信`);
        const note = $('today-hero-note');
        note.hidden = isToday;
        note.textContent = isToday ? '' : `今天这封还在路上，这是${label === '昨天' ? '昨天' : '最近'}的`;

        const parts = letterParts(item);
        const titleEl = $('today-hero-title');
        titleEl.innerHTML = TS.html(parts.title);
        titleEl.classList.toggle('is-long', parts.isLong);
        if (parts.isLong) TS.unfit(titleEl);
        $('today-hero-sign').innerHTML = signHtml(parts);
        $('today-hero-date').innerHTML =
            unit(`<span class="num">${d.getFullYear()}</span> 年 <span class="num">${d.getMonth() + 1}</span> 月 <span class="num">${d.getDate()}</span> 日`) + SEP +
            unit(`星期${WEEKDAYS_ZH[d.getDay()]}`);
        $('today-hero-days').innerHTML = unit(`在一起的第 <span class="num">${dayNo}</span> 天`);

        const img = $('today-hero-img');
        img.onload = layoutHero;
        img.src = `images/${item.filename}`;
        img.alt = getArtworkLabel(item);
        $('today-hero-art').setAttribute('aria-label', `看大图：${label}的画，${getArtworkLabel(item)}`);
        heroEl.setAttribute('aria-label', `${label}的画信`);

        maybeStamp($('today-hero-seal'), item.date);
        renderHeroRuler(item);

        heroEl.dataset.date = item.date;
        heroEl.hidden = false;
        layoutHero();
        return item;
    }

    const openHero = () => openItem(dataByDate[heroEl.dataset.date]);
    $('today-hero-art').addEventListener('click', openHero);
    $('today-hero-art').addEventListener('mouseenter', () => setTorchMode(true));
    $('today-hero-art').addEventListener('mouseleave', () => setTorchMode(false));
    $('today-hero-open').addEventListener('click', openHero);
    $('today-hero-ruler').addEventListener('click', (event) => {
        const btn = event.target.closest('button[data-date]');
        if (btn) openItem(dataByDate[btn.dataset.date]);
    });

    function showEmptyState() {
        heroEl.hidden = true;
        emptyState.hidden = false;
        const today = getToday();
        $('empty-title').textContent = '花期未至';
        $('empty-date-text').innerHTML =
            unit(escapeHtml(`${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`)) + SEP + unit('第一封画信还在路上');
        $('empty-subtext').textContent = 'The first letter is still on its way.';
    }

    // ============================================================
    // 长廊：从今天往回走，一步一天
    // ============================================================
    let corridorBuilt = false;
    let corridorItems = [];
    let activeMonth = null;

    function corridorTag(item, isToday) {
        if (isToday) return '今天';
        const special = specialFor(item.date);
        return special ? special.short : '';
    }

    function renderCorridor() {
        corridorBuilt = true;
        if (!galleryData.length) {
            corridorScroll.innerHTML = '<p class="view-sub">第一封画信还在路上。</p>';
            return;
        }
        const todayStr = formatDateISO(getToday());
        const monthCounts = {};
        galleryData.forEach((item) => {
            const key = item.date.slice(0, 7);
            monthCounts[key] = (monthCounts[key] || 0) + 1;
        });
        const html = [];
        const months = [];
        let month = '';
        galleryData.forEach((item, i) => {
            const d = item.dateObj;
            const key = item.date.slice(0, 7);
            if (key !== month) {
                month = key;
                months.push({ key, y: d.getFullYear(), m: d.getMonth() });
                html.push(
                    `<div class="cor-month" id="cor-${key}" data-month="${key}">` +
                    `<span class="cor-month-cn">${MONTH_CN[d.getMonth()]}</span>` +
                    `<span class="cor-month-year">${d.getFullYear()}</span>` +
                    `<span class="cor-month-count">${monthCounts[key]} 封</span></div>`
                );
            }
            const isToday = item.date === todayStr;
            const moon = moonStyle(moonLit(d), 13);
            const tag = corridorTag(item, isToday);
            const title = letterParts(item).title || getArtworkThemeText(item);
            const src = `images/${item.filename}`;
            const label = `${d.getMonth() + 1}月${d.getDate()}日，${title}，在一起的第 ${getDayNumber(d)} 天`;
            html.push(
                `<button type="button" class="cor-item${isToday ? ' is-today' : ''}" data-date="${item.date}" aria-label="${escapeHtml(label)}">` +
                '<span class="cor-frame">' +
                `<img class="cor-img" src="${src}" alt="" loading="${i < 6 ? 'eager' : 'lazy'}" decoding="async">` +
                '</span>' +
                '<span class="cor-cap"><span class="cor-cap-row"><span class="cor-when">' +
                `<span class="cor-date">${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}</span>` +
                `<span class="cor-wd">星期${WEEKDAYS_ZH[d.getDay()]}</span>` +
                (tag ? `<span class="cor-tag">${escapeHtml(tag)}</span>` : '') +
                '</span>' +
                `<span class="cor-moon" aria-hidden="true" style="background:${moon.bg};box-shadow:${moon.shadow}"></span>` +
                '</span>' +
                `<span class="cor-title">${escapeHtml(title)}</span></span></button>`
            );
        });
        corridorScroll.innerHTML = html.join('');
        corridorItems = [...corridorScroll.querySelectorAll('.cor-item')];

        // 画框按真实比例定（加载前先按 16:9 占位）。桌面上框多宽这一格就多宽：
        // 视野左边的画加载完会变宽变窄，把差值补回 scrollLeft，眼前这幅就不会被挤走（手机每格同宽，差值总是 0）
        corridorScroll.querySelectorAll('.cor-img').forEach((img) => {
            const setRatio = () => {
                if (!img.naturalWidth) return;
                const item = img.closest('.cor-item');
                const before = item.offsetWidth;
                const isLeft = item.offsetLeft < corridorScroll.scrollLeft;
                item.style.setProperty('--r', (img.naturalWidth / img.naturalHeight).toFixed(4));
                img.classList.add('is-loaded');
                const delta = item.offsetWidth - before;
                if (isLeft && delta) corridorScroll.scrollLeft += delta;
            };
            if (img.complete) setRatio();
            else img.addEventListener('load', () => {
                setRatio();
                scheduleCorridorMarks();
            }, { once: true });
        });

        activeMonth = null;
        corridorMonths.innerHTML = months.map((mo) =>
            `<button type="button" class="month-chip" data-month="${mo.key}">${MONTH_CN[mo.m]}${mo.y !== getToday().getFullYear() ? ` <span class="num">${mo.y}</span>` : ''}</button>`
        ).join('');

        const fmt = (d) => `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`;
        $('corridor-start').textContent = fmt(galleryData[0].dateObj);
        $('corridor-end').textContent = fmt(galleryData[galleryData.length - 1].dateObj);
        // 手机一屏一幅：一进来就把今天这幅放在正中
        if (isMobileLayout()) scrollCorridorTo(corridorScroll.querySelector('.cor-item'), false);
        scheduleCorridorMarks();
        syncCorridor();
    }

    const corridorMax = () => Math.max(0, corridorScroll.scrollWidth - corridorScroll.clientWidth);

    // 走到某一幅时长廊该滚到哪：桌面靠左对齐，手机居中
    function corridorTarget(el) {
        if (isMobileLayout()) return el.offsetLeft - (corridorScroll.clientWidth - el.offsetWidth) / 2;
        return el.offsetLeft - (parseFloat(getComputedStyle(corridorScroll).paddingLeft) || 0);
    }
    // 近处平滑走过去；远处（隔着一屏半以上）暗一下直接到，
    // 免得一路经过的画全被加载、宽度一变就停错位置
    let jumpTimer = null;
    function scrollCorridorTo(el, smooth = true) {
        if (!el) return;
        const left = clamp(corridorTarget(el), 0, corridorMax());
        const far = Math.abs(left - corridorScroll.scrollLeft) > corridorScroll.clientWidth * 1.5;
        if (!smooth || reduceMotion()) {
            corridorScroll.scrollLeft = left;
            return;
        }
        if (!far) {
            corridorScroll.scrollTo({ left, behavior: 'smooth' });
            return;
        }
        clearTimeout(jumpTimer);
        corridorScroll.classList.add('is-jumping');
        jumpTimer = setTimeout(() => {
            corridorScroll.scrollLeft = clamp(corridorTarget(el), 0, corridorMax());
            requestAnimationFrame(() => corridorScroll.classList.remove('is-jumping'));
        }, 180);
    }

    // 进度条上方的小标记：生日、纪念日；点一下走到那一天
    function placeCorridorMarks() {
        if (!corridorBuilt || !corridorMarks) return;
        const max = corridorMax();
        if (!max) {
            corridorMarks.innerHTML = '';
            return;
        }
        const marks = [];
        corridorScroll.querySelectorAll('.cor-item').forEach((el) => {
            const special = specialFor(el.dataset.date);
            if (!special || special.short === '第一封') return;
            const pct = clamp(corridorTarget(el) / max, 0, 1) * 100;
            marks.push(`<button type="button" tabindex="-1" class="corridor-mark${special.love ? ' is-love' : ''}" data-date="${el.dataset.date}" style="left:${pct.toFixed(2)}%">${escapeHtml(special.short)}</button>`);
        });
        corridorMarks.innerHTML = marks.join('');
        // 靠两头的标签别伸出进度条：本来居中对齐那一点，挨边时往里收
        const trackW = corridorMarks.clientWidth;
        [...corridorMarks.children].forEach((el) => {
            const point = (parseFloat(el.style.left) / 100) * trackW;
            const w = el.offsetWidth;
            const shift = clamp(w / 2, point + w - trackW - 7, point + 7);
            el.style.transform = `translateX(${(-shift).toFixed(1)}px)`;
        });
        // 挨得太近的标签错开两行，再挤就只留前一个
        const rowEnds = [-Infinity, -Infinity];
        [...corridorMarks.children]
            .map((el) => ({ el, rect: el.getBoundingClientRect() }))
            .sort((a, b) => a.rect.left - b.rect.left)
            .forEach(({ el, rect }) => {
                const row = rowEnds.findIndex((end) => rect.left >= end + 8);
                if (row === -1) {
                    el.hidden = true;
                    return;
                }
                el.classList.toggle('is-up', row === 1);
                rowEnds[row] = rect.right;
            });
    }
    corridorMarks?.addEventListener('click', (e) => {
        const mark = e.target.closest('.corridor-mark');
        if (mark) scrollCorridorTo(corridorScroll.querySelector(`.cor-item[data-date="${mark.dataset.date}"]`));
    });
    let marksTimer = null;
    function scheduleCorridorMarks() {
        clearTimeout(marksTimer);
        marksTimer = setTimeout(placeCorridorMarks, 200);
    }

    function syncCorridor() {
        const max = corridorMax();
        const left = corridorScroll.scrollLeft;
        corridorRange.value = max ? String(Math.round((left / max) * 1000)) : '0';
        // 当前走到了哪个月：看视野左边三分之一处是哪一幅（手机上竖排月份是隐藏的，所以按画算）
        const probe = left + corridorScroll.clientWidth * (isMobileLayout() ? 0.5 : 0.35);
        const here = corridorItems.find((el) => el.offsetLeft + el.offsetWidth > probe) || corridorItems[corridorItems.length - 1];
        const active = here ? here.dataset.date.slice(0, 7) : null;
        if (active === activeMonth) return;
        activeMonth = active;
        corridorMonths.querySelectorAll('.month-chip').forEach((chip) => {
            const on = chip.dataset.month === active;
            chip.classList.toggle('is-active', on);
            if (on) chip.setAttribute('aria-current', 'true');
            else chip.removeAttribute('aria-current');
            // 月份条在手机上也会横向滚：把当前月挪进视野（只动这一条，不动页面）
            if (on && corridorMonths.scrollWidth > corridorMonths.clientWidth) {
                const from = chip.offsetLeft - corridorMonths.offsetLeft;
                const view = corridorMonths.scrollLeft;
                if (from < view || from + chip.offsetWidth > view + corridorMonths.clientWidth) {
                    corridorMonths.scrollTo({ left: from - 12, behavior: reduceMotion() ? 'auto' : 'smooth' });
                }
            }
        });
    }

    let corridorRaf = 0;
    corridorScroll.addEventListener('scroll', () => {
        if (corridorRaf) return;
        corridorRaf = requestAnimationFrame(() => {
            corridorRaf = 0;
            syncCorridor();
        });
    }, { passive: true });

    corridorRange.addEventListener('input', () => {
        corridorScroll.scrollLeft = (Number(corridorRange.value) / 1000) * corridorMax();
    });

    // 桌面：竖着滚的滚轮沿长廊横着走；走到头再交还给页面
    corridorScroll.addEventListener('wheel', (e) => {
        if (e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
        const max = corridorMax();
        if (!max) return;
        const delta = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
        const left = corridorScroll.scrollLeft;
        if ((delta < 0 && left <= 0) || (delta > 0 && left >= max - 1)) return;
        e.preventDefault();
        corridorScroll.scrollLeft = left + delta;
    }, { passive: false });

    corridorScroll.addEventListener('click', (e) => {
        const btn = e.target.closest('.cor-item');
        if (btn) openItem(dataByDate[btn.dataset.date]);
    });
    corridorScroll.addEventListener('mouseover', (e) => {
        if (e.target.closest('.cor-item')) setTorchMode(true);
    });
    corridorScroll.addEventListener('mouseout', (e) => {
        if (e.target.closest('.cor-item') && !e.relatedTarget?.closest?.('.cor-item')) setTorchMode(false);
    });

    corridorMonths.addEventListener('click', (e) => {
        const chip = e.target.closest('.month-chip');
        if (!chip) return;
        const marker = $(`cor-${chip.dataset.month}`);
        if (!marker) return;
        // 手机上把这个月的第一幅放正中，桌面上让竖排月份靠左
        scrollCorridorTo(isMobileLayout() ? marker.nextElementSibling : marker);
    });

    // ============================================================
    // 画历：一个月的圆窗
    // ============================================================
    let calMonth = new Date(getToday().getFullYear(), getToday().getMonth(), 1);
    let calBuilt = false;

    const firstLetterMonth = () => {
        const first = sortedDates.length ? parseISO(sortedDates[0]) : getToday();
        return new Date(first.getFullYear(), first.getMonth(), 1);
    };
    const thisMonth = () => new Date(getToday().getFullYear(), getToday().getMonth(), 1);
    const monthKey = (d) => d.getFullYear() * 12 + d.getMonth();

    function renderCalendar() {
        calBuilt = true;
        const y = calMonth.getFullYear();
        const m = calMonth.getMonth();
        const daysIn = new Date(y, m + 1, 0).getDate();
        const firstDow = new Date(y, m, 1).getDay();
        const today = getToday();
        const todayStr = formatDateISO(today);
        const fullDay = fullMoonDay(y, m);

        $('cal-month').textContent = MONTH_CN[m];
        $('cal-month').classList.toggle('is-long', MONTH_CN[m].length > 2);
        $('cal-en').textContent = `${MONTH_EN[m]} · ${y}`;
        document.title = `Love Minnie · 画历 · ${y}年${m + 1}月`;

        // 这个月有几封、该有几封
        const monthPrefix = `${y}-${pad2(m + 1)}`;
        const count = sortedDates.filter((iso) => iso.startsWith(monthPrefix)).length;
        const firstIso = sortedDates[0] || todayStr;
        let possible = 0;
        for (let day = 1; day <= daysIn; day++) {
            const iso = `${monthPrefix}-${pad2(day)}`;
            if (iso >= firstIso && iso <= todayStr) possible++;
        }
        const countEl = $('cal-count');
        if (!count) {
            countEl.textContent = monthKey(calMonth) > monthKey(today) ? '花期未至。' : '这个月还没有画信。';
        } else if (count >= possible) {
            countEl.innerHTML = `<span class="num">${count}</span> 封画信，一天不落。`;
        } else {
            countEl.innerHTML = `已收到 <span class="num">${count}</span> 封画信。`;
        }

        // 前后月
        const prev = new Date(y, m - 1, 1);
        const next = new Date(y, m + 1, 1);
        $('cal-prev-label').textContent = MONTH_CN[prev.getMonth()];
        $('cal-next-label').textContent = MONTH_CN[next.getMonth()];
        calPrev.disabled = monthKey(prev) < monthKey(firstLetterMonth());
        calNext.disabled = monthKey(next) > monthKey(thisMonth());
        calPrev.setAttribute('aria-label', `上个月：${prev.getFullYear()}年${prev.getMonth() + 1}月`);
        calNext.setAttribute('aria-label', `下个月：${next.getFullYear()}年${next.getMonth() + 1}月`);

        // 圆窗
        const cells = [];
        for (let i = 0; i < firstDow; i++) cells.push('<span class="cal-day is-blank" aria-hidden="true"></span>');
        for (let day = 1; day <= daysIn; day++) {
            const iso = `${monthPrefix}-${pad2(day)}`;
            const item = dataByDate[iso] || null;
            const future = iso > todayStr;
            const isToday = iso === todayStr;
            const special = specialFor(iso);
            const cls = ['cal-day'];
            if (!item && !future) cls.push('is-empty');
            if (future) cls.push('is-future');
            if (isToday) cls.push('is-today');
            if (day === fullDay) cls.push('is-full');
            if (special && !isToday) cls.push(special.love ? 'is-love' : 'is-gold');
            const art = item ? `<img src="images/${item.filename}" alt="" loading="lazy" decoding="async">` : '';
            const title = item ? (letterParts(item).title || getArtworkThemeText(item)) : '';
            const bits = [`${m + 1}月${day}日`];
            if (title) bits.push(title);
            if (special) bits.push(special.name);
            if (day === fullDay) bits.push('满月');
            if (isToday) bits.push('今天');
            if (future) bits.push('还没到');
            else if (!item) bits.push('这天没有画信');
            cells.push(
                `<button type="button" class="${cls.join(' ')}" data-date="${iso}" aria-label="${escapeHtml(bits.join('，'))}">` +
                '<span class="cal-win" aria-hidden="true"><span class="cal-win-edge"></span>' +
                `<span class="cal-win-art">${art}</span></span>` +
                `<span class="cal-num">${day}</span>` +
                (special && special.love && !isToday ? `<span class="cal-heart" aria-hidden="true">${HEART_SVG}</span>` : '') +
                '</button>'
            );
        }
        calGrid.innerHTML = cells.join('');

        // 这个月的特别日子：生日、纪念日、满月
        const specials = [];
        for (let day = 1; day <= daysIn; day++) {
            const iso = `${monthPrefix}-${pad2(day)}`;
            const special = specialFor(iso);
            if (special) specials.push({ iso, day, name: special.name, love: !!special.love });
            if (day === fullDay) specials.push({ iso, day, name: '满月', moon: true });
        }
        const listHtml = specials.map((s) => {
            const item = dataByDate[s.iso];
            const future = s.iso > todayStr;
            const dateText = `<span class="cal-special-date">${m + 1}.${s.day}</span>`;
            let name = escapeHtml(s.name);
            if (future) {
                const left = diffDays(today, parseISO(s.iso));
                name += SEP + unit(`还有 <span class="num">${left}</span> 天`);
            }
            const cls = `cal-special-item${s.love ? ' is-love' : ''}`;
            let lead = `<img class="cal-special-thumb" src="images/${item?.filename}" alt="" loading="lazy">`;
            if (s.moon) lead = '<span class="cal-special-moon" aria-hidden="true"></span>';
            else if (!item) lead = '<span class="cal-special-moon is-ring" aria-hidden="true"></span>';
            if (item && !s.moon) {
                return `<li><button type="button" class="${cls}" data-date="${s.iso}">${lead}${dateText}<span class="cal-special-name">${name}</span></button></li>`;
            }
            return `<li><div class="${cls}">${lead}${dateText}<span class="cal-special-name">${name}</span></div></li>`;
        }).join('');
        $('cal-special').innerHTML = listHtml;
        $('cal-special-wrap').hidden = !specials.length;
        $('memory-lane-btn').hidden = !galleryData.length;
    }

    function shiftCalendar(offset) {
        const next = new Date(calMonth.getFullYear(), calMonth.getMonth() + offset, 1);
        if (monthKey(next) < monthKey(firstLetterMonth()) || monthKey(next) > monthKey(thisMonth())) return;
        calMonth = next;
        renderCalendar();
    }

    calPrev.addEventListener('click', () => shiftCalendar(-1));
    calNext.addEventListener('click', () => shiftCalendar(1));

    const EMPTY_DAY_PHRASES = ['这一天还在路上', '这一天的花还含苞', '这一天等你点亮', '这一天慢慢靠近', '这一天先留白'];
    calGrid.addEventListener('click', (e) => {
        const cell = e.target.closest('.cal-day');
        if (!cell || cell.classList.contains('is-blank')) return;
        const item = dataByDate[cell.dataset.date];
        if (item) {
            openItem(item);
            return;
        }
        const d = parseISO(cell.dataset.date);
        const phrase = cell.classList.contains('is-future')
            ? EMPTY_DAY_PHRASES[Math.floor(Math.random() * EMPTY_DAY_PHRASES.length)]
            : '这一天没有画信';
        showToast(unit(`${d.getMonth() + 1}月${d.getDate()}日`) + SEP + unit(phrase));
    });
    $('cal-special').addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-date]');
        if (btn) openItem(dataByDate[btn.dataset.date]);
    });

    // 随机重温：从历史画信里随机抽一封打开
    $('memory-lane-btn').addEventListener('click', () => {
        if (!galleryData.length) return;
        const todayISO = formatDateISO(getToday());
        const pool = galleryData.filter((d) => d.date !== todayISO);
        const source = pool.length ? pool : galleryData;
        openItem(source[Math.floor(Math.random() * source.length)]);
    });

    // ============================================================
    // 视图切换：#today / #corridor / #calendar
    // ============================================================
    const VIEWS = ['today', 'corridor', 'calendar'];
    const VIEW_TITLES = { today: 'Love Minnie · 画信', corridor: 'Love Minnie · 长廊' };
    let currentView = null;
    let dataReady = false;

    const viewFromHash = () => {
        const name = window.location.hash.replace('#', '');
        return VIEWS.includes(name) ? name : 'today';
    };

    function setView(view, { scroll = true } = {}) {
        currentView = view;
        document.body.dataset.view = view;
        VIEWS.forEach((v) => {
            $(`view-${v}`).hidden = v !== view;
        });
        document.querySelectorAll('.lm-tab, .nav-item[data-view]').forEach((el) => {
            const on = el.dataset.view === view;
            el.classList.toggle('is-active', on);
            el.classList.toggle('active', on);
            if (on) el.setAttribute('aria-current', 'page');
            else el.removeAttribute('aria-current');
        });
        if (VIEW_TITLES[view]) document.title = VIEW_TITLES[view];
        if (dataReady) {
            if (view === 'today') layoutHero();
            if (view === 'corridor') {
                if (!corridorBuilt) renderCorridor();
                else {
                    placeCorridorMarks();
                    syncCorridor();
                }
            }
            if (view === 'calendar') renderCalendar();
        }
        if (scroll) window.scrollTo(0, 0);
    }

    window.addEventListener('hashchange', () => {
        if (detailModal.classList.contains('open')) closeDetail({ restoreFocus: false });
        closeSeasonSheet();
        setView(viewFromHash());
    });

    // ============================================================
    // 胶卷条：看画时出现在底部，点哪张换哪张
    // ============================================================
    let timelineHydrated = false;

    function renderTimeline() {
        timelineContainer.innerHTML = '';
        const allItems = [...galleryData].reverse();
        const lastDate = allItems.length ? new Date(allItems[allItems.length - 1].dateObj) : getToday();
        for (let i = 1; i <= 5; i++) {
            const futureDate = new Date(lastDate);
            futureDate.setDate(lastDate.getDate() + i);
            allItems.push({ date: formatDateISO(futureDate), dateObj: futureDate, isFuture: true });
        }
        const selectedKey = formatDateISO(selectedDate);
        const selectedIndex = Math.max(0, allItems.findIndex((item) => item.date === selectedKey));

        allItems.forEach((item, index) => {
            const thumb = document.createElement('div');
            thumb.className = 'timeline-thumb';
            thumb.dataset.date = item.date;
            if (item.isFuture) {
                thumb.classList.add('future');
                thumb.innerHTML = '<img src="images/sunflower.svg" class="sunflower-icon" alt="尚未上画">';
            } else {
                const img = document.createElement('img');
                // 胶卷条只在看画时出现：先不给 src，第一次打开看画再加载，省下首屏流量
                img.dataset.src = `images/${item.filename}`;
                img.alt = getArtworkLabel(item);
                img.decoding = 'async';
                img.loading = Math.abs(index - selectedIndex) <= 24 ? 'eager' : 'lazy';
                img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
                img.addEventListener('error', () => thumb.classList.add('is-error'));
                if (timelineHydrated) hydrateThumb(img);
                thumb.appendChild(img);
                const badge = document.createElement('span');
                badge.className = 'thumb-badge';
                badge.textContent = `${item.dateObj.getMonth() + 1}.${item.dateObj.getDate()}`;
                thumb.appendChild(badge);
                thumb.addEventListener('click', () => {
                    selectDate(item.dateObj);
                    if (detailModal.classList.contains('open')) openDetail(item);
                });
            }
            if (item.date === selectedKey) thumb.classList.add('selected');
            timelineContainer.appendChild(thumb);
        });
    }

    function hydrateThumb(img) {
        if (!img.dataset.src) return;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        if (img.complete && img.naturalWidth) img.classList.add('is-loaded');
    }

    function hydrateTimeline() {
        if (timelineHydrated) return;
        timelineHydrated = true;
        timelineContainer.querySelectorAll('img[data-src]').forEach(hydrateThumb);
    }

    $('timeline-prev').addEventListener('click', () => timelineContainer.scrollBy({ left: -200, behavior: 'smooth' }));
    $('timeline-next').addEventListener('click', () => timelineContainer.scrollBy({ left: 200, behavior: 'smooth' }));

    function selectDate(date) {
        selectedDate = new Date(date);
        const dateStr = formatDateISO(selectedDate);
        timelineContainer.querySelectorAll('.timeline-thumb.selected').forEach((el) => el.classList.remove('selected'));
        const thumb = timelineContainer.querySelector(`.timeline-thumb[data-date="${dateStr}"]`);
        if (thumb) {
            thumb.classList.add('selected');
            if (detailModal.classList.contains('open')) {
                thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
        const item = dataByDate[dateStr];
        if (item) applyImageTone(item.filename);
    }

    // ============================================================
    // 看画
    // ============================================================
    let lastDetailFocus = null;

    function fitDetailTitle() {
        if (!detailTitle) return;
        if (detailTitle.classList.contains('is-long')) {
            TS.unfit(detailTitle);
            return;
        }
        const chars = Array.from(detailTitle.textContent.replace(/\s/g, '')).length;
        const mobile = isMobileLayout();
        TS.fit(detailTitle, { max: mobile ? 28 : 34, min: mobile ? 20 : 22, maxLines: chars <= 10 ? 1 : 2 });
    }

    // 手机上第一次看画时提示一次可以左右滑
    const SWIPE_HINT_KEY = 'love-minnie-swipe-hint-v1';
    let swipeHintShown = false;
    function maybeShowSwipeHint() {
        if (swipeHintShown || !isMobileLayout()) return;
        swipeHintShown = true;
        let seen = false;
        try {
            seen = localStorage.getItem(SWIPE_HINT_KEY) === '1';
            localStorage.setItem(SWIPE_HINT_KEY, '1');
        } catch (err) {
            seen = false;
        }
        if (seen) return;
        const hint = $('detail-hint');
        if (!hint) return;
        hint.classList.add('is-visible');
        setTimeout(() => hint.classList.remove('is-visible'), 2800);
    }

    function getDetailFocusable() {
        const dialog = detailModal.querySelector('.detail-dialog') || detailModal;
        return [...dialog.querySelectorAll(
            'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )].filter((el) => el.getAttribute('aria-hidden') !== 'true');
    }

    function setBackgroundInert(isInert) {
        [...document.body.children].forEach((el) => {
            if (el === detailModal) return;
            // 影院模式仍允许底栏胶卷条点选换画
            if (el.classList.contains('timeline-strip')) return;
            if (isInert) el.setAttribute('inert', '');
            else el.removeAttribute('inert');
        });
    }

    function trapDetailFocus(e) {
        const focusable = getDetailFocusable();
        if (!focusable.length) {
            e.preventDefault();
            detailClose?.focus();
            return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        const inside = detailModal.contains(active);
        if (focusable.length === 1 || !inside) {
            e.preventDefault();
            first.focus();
            return;
        }
        if (e.shiftKey && active === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && active === last) {
            e.preventDefault();
            first.focus();
        }
    }

    function openDetail(item) {
        if (!item || !detailModal) return;

        const detailDialog = detailModal.querySelector('.detail-dialog');
        const updateDetailOrientation = () => {
            if (!detailDialog || !detailImage.naturalWidth) return;
            const isPortrait = detailImage.naturalHeight > detailImage.naturalWidth * 1.05;
            detailDialog.classList.toggle('is-portrait', isPortrait);
            detailDialog.classList.toggle('is-landscape', !isPortrait);
            fitDetailTitle();
        };

        detailDialog?.classList.remove('is-portrait', 'is-landscape');
        // 先绑定 onload，再切换 src，避免缓存图片时错过方向识别
        detailImage.onload = updateDetailOrientation;
        detailImage.src = `images/${item.filename}`;
        detailImage.alt = getArtworkLabel(item);
        // 看画的同图氛围底：铺满整个屏幕
        detailModal.style.setProperty('--detail-bg', `url("${detailImage.src}")`);

        // 展签：日期 → 第几天、第几封 → 今日份爱你 → 主题 → 落款
        const d = item.dateObj;
        detailDate.innerHTML =
            unit(`${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`) + SEP +
            unit(`星期${WEEKDAYS_ZH[d.getDay()]}`);
        $('detail-sub').innerHTML =
            unit(`在一起的第 <span class="num">${getDayNumber(d)}</span> 天`) + SEP +
            unit(`第 <span class="num">${getChronoNo(item)}</span> 封画信`);

        const parts = letterParts(item);
        detailTitle.innerHTML = TS.html(parts.title || '这是一个特别的日子');
        detailTitle.classList.toggle('is-long', parts.isLong);
        detailLetter.innerHTML = parts.rest ? TS.html(parts.rest) : '';
        detailDialog?.classList.toggle('is-long-letter', parts.isLong || !!parts.rest);
        $('detail-sign').innerHTML = signHtml(parts);
        $('detail-postmark').innerHTML = postmarkSvg(d, getChronoNo(item), getDayNumber(d));
        maybeStamp($('detail-seal'), item.date);

        const description = item.description ? item.description.trim() : '';
        detailDescription.innerHTML = description && description !== (item.loveLetter || '').trim()
            ? TS.html(description)
            : '';

        detailModal.classList.add('open');
        detailModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        if (!lastDetailFocus) lastDetailFocus = document.activeElement;
        setBackgroundInert(true);
        detailClose?.focus();
        if (detailImage.complete) updateDetailOrientation();
        else fitDetailTitle();
        // 手机上不显示胶卷条，就不去加载它的图
        if (!isMobileLayout()) hydrateTimeline();
        maybeShowSwipeHint();

        // Edit 是管理功能，只在 URL 带 ?admin=1 时显示，避免打扰观众视角
        let editBtn = $('detail-edit');
        if (params.has('admin')) {
            if (!editBtn) {
                editBtn = document.createElement('button');
                editBtn.id = 'detail-edit';
                editBtn.type = 'button';
                editBtn.className = 'detail-action-btn';
                editBtn.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-edit"></use></svg>';
                editBtn.setAttribute('aria-label', 'Review & Edit');
                detailModal.querySelector('.detail-header')?.appendChild(editBtn);
            }
            editBtn.onclick = () => {
                window.location.href = `admin.html?date=${item.date}`;
            };
        } else if (editBtn) {
            editBtn.remove();
        }
    }

    function closeDetail({ restoreFocus = true } = {}) {
        if (!detailModal.classList.contains('open')) return;
        detailModal.classList.remove('open');
        detailModal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
        setBackgroundInert(false);
        const restore = lastDetailFocus;
        lastDetailFocus = null;
        if (restoreFocus && restore && typeof restore.focus === 'function' && document.contains(restore)) {
            restore.focus();
        }
    }

    detailClose?.addEventListener('click', () => closeDetail());
    detailModal.addEventListener('click', (e) => {
        if (e.target === detailModal) closeDetail();
    });

    // 前一封 / 后一封（按日期，左早右晚）
    const detailMediaEl = detailModal.querySelector('.detail-media');
    function navigateLetter(offset, { animate = false } = {}) {
        const index = sortedDates.indexOf(formatDateISO(selectedDate));
        if (index === -1) return;
        const target = sortedDates[index + offset];
        if (!target) {
            // 到头了：轻轻顶一下
            if (detailMediaEl) {
                detailMediaEl.style.transform = offset > 0 ? 'translateX(-10px)' : 'translateX(10px)';
                setTimeout(() => {
                    detailMediaEl.style.transform = '';
                }, 150);
            }
            return;
        }
        const item = dataByDate[target];
        if (!animate || !detailMediaEl || reduceMotion()) {
            openItem(item);
            return;
        }
        detailMediaEl.style.transition = 'transform 0.25s ease-out, opacity 0.2s ease';
        detailMediaEl.style.transform = `translateX(${offset > 0 ? '-100%' : '100%'})`;
        detailMediaEl.style.opacity = '0';
        setTimeout(() => {
            openItem(item);
            detailMediaEl.style.transition = 'none';
            detailMediaEl.style.transform = `translateX(${offset > 0 ? '100%' : '-100%'})`;
            requestAnimationFrame(() => {
                detailMediaEl.style.transition = 'transform 0.25s ease-out, opacity 0.2s ease';
                detailMediaEl.style.transform = 'translateX(0)';
                detailMediaEl.style.opacity = '1';
            });
        }, 200);
    }

    // 手机：左右滑换画
    let touchStartX = 0;
    let touchStartY = 0;
    detailModal.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });
    detailModal.addEventListener('touchend', (e) => {
        const deltaX = e.changedTouches[0].screenX - touchStartX;
        const deltaY = e.changedTouches[0].screenY - touchStartY;
        if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 100) {
            navigateLetter(deltaX > 0 ? -1 : 1, { animate: true });
        }
    }, { passive: true });

    document.addEventListener('keydown', (e) => {
        if (detailModal.classList.contains('open')) {
            if (e.key === 'Tab') {
                trapDetailFocus(e);
                return;
            }
            if (e.key === 'Escape') {
                closeDetail();
                return;
            }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                navigateLetter(e.key === 'ArrowLeft' ? -1 : 1);
            }
            return;
        }
        if (seasonSheet.classList.contains('open') || e.altKey || e.ctrlKey || e.metaKey) return;
        // 画历里 ← → 翻月
        if (currentView === 'calendar' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            e.preventDefault();
            shiftCalendar(e.key === 'ArrowLeft' ? -1 : 1);
        }
    });

    // ============================================================
    // 轻提示
    // ============================================================
    let toastTimer = null;
    function showToast(html) {
        const toast = $('lm-toast');
        if (!toast) return;
        toast.innerHTML = html;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
    }

    // ============================================================
    // 尺寸变化
    // ============================================================
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (currentView === 'today') layoutHero();
            if (currentView === 'corridor') {
                placeCorridorMarks();
                syncCorridor();
            }
            if (detailModal.classList.contains('open')) fitDetailTitle();
        }, 150);
    });

    // ============================================================
    // 数据
    // ============================================================
    const loadGalleryData = () => {
        if (Array.isArray(window.__GALLERY_DATA__)) return Promise.resolve(window.__GALLERY_DATA__);
        return fetch('data.json').then((res) => {
            if (!res.ok) throw new Error(`Failed to load data.json (${res.status})`);
            return res.json();
        });
    };

    setView(viewFromHash(), { scroll: false });

    loadGalleryData()
        .then((data) => {
            const todayStr = formatDateISO(getToday());
            galleryData = data
                .filter((item) => item && /^\d{4}-\d{2}-\d{2}$/.test(item.date) && item.filename && item.date <= todayStr)
                .map((item) => ({ ...item, dateObj: parseISO(item.date) }))
                .sort((a, b) => (a.date < b.date ? 1 : -1));
            dataByDate = {};
            galleryData.forEach((item) => {
                dataByDate[item.date] = item;
            });
            sortedDates = Object.keys(dataByDate).sort();
            chronoIndex = new Map(sortedDates.map((iso, i) => [iso, i + 1]));
            dataReady = true;

            const hero = renderTodayHero();
            if (!hero) showEmptyState();
            selectDate(hero ? hero.dateObj : getToday());
            renderTimeline();
            setView(viewFromHash(), { scroll: false });

            // 从首页月轮选中某天进来（?day=YYYY-MM-DD）：直接打开那一封，不越过"今天"
            const requestedDay = params.get('day') || '';
            if (/^\d{4}-\d{2}-\d{2}$/.test(requestedDay) && dataByDate[requestedDay]) {
                openItem(dataByDate[requestedDay]);
            }
        })
        .catch((err) => {
            console.error('Error loading data:', err);
            dataReady = true;
            showEmptyState();
        });

    // ============================================================
    // 排版自检：URL 带 ?lmdev=1 时暴露钩子，可逐封渲染今日卡和看画页，
    // 批量检查断行（正常访问不受影响）
    // ============================================================
    if (params.has('lmdev')) {
        const imageReady = (img) => (img.complete && img.naturalWidth)
            ? Promise.resolve()
            : new Promise((resolve) => {
                img.addEventListener('load', resolve, { once: true });
                img.addEventListener('error', resolve, { once: true });
            });
        window.__LM = {
            dates: () => galleryData.map((d) => d.date),
            async hero(dateStr) {
                const item = dataByDate[dateStr];
                if (!item) return false;
                closeDetail();
                if (currentView !== 'today') setView('today', { scroll: false });
                renderTodayHero({ item, isToday: true });
                await imageReady($('today-hero-img'));
                layoutHero();
                return true;
            },
            async detail(dateStr) {
                const item = dataByDate[dateStr];
                if (!item) return false;
                openDetail(item);
                await imageReady(detailImage);
                fitDetailTitle();
                return true;
            },
            close: closeDetail
        };
    }
});
