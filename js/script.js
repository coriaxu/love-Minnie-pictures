/**
 * Minnie's 2026 - Calendar Journal Hybrid
 * Gallery grid with detail sidebar modal
 */

document.addEventListener('DOMContentLoaded', () => {
    // ============================================================
    // DOM Elements
    // ============================================================
    const calendarDays = document.getElementById('calendar-days');
    const monthLabel = document.getElementById('current-month-label');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const toggleCalendarBtn = document.getElementById('toggle-calendar');
    const calendarSidebar = document.getElementById('calendar-sidebar');

    const galleryGrid = document.getElementById('gallery-grid');
    const emptyState = document.getElementById('empty-state');
    const emptyTitle = document.getElementById('empty-title');
    const emptyDateText = document.getElementById('empty-date-text');
    const emptySubtext = document.getElementById('empty-subtext');

    const timelineContainer = document.getElementById('timeline-container');
    const timelinePrev = document.getElementById('timeline-prev');
    const timelineNext = document.getElementById('timeline-next');

    const bgBlur = document.getElementById('bg-blur');
    const dateCapsule = document.getElementById('date-capsule');

    const detailModal = document.getElementById('detail-modal');
    const detailImage = document.getElementById('detail-image');
    const detailTitle = document.getElementById('detail-title');
    const detailDate = document.getElementById('detail-date');
    const detailDescription = document.getElementById('detail-description');
    const detailLetter = document.getElementById('detail-letter');
    const detailClose = document.getElementById('detail-close');

    // ============================================================
    // ROSE TORCH：跟随鼠标的柔光（仅桌面，鼠标本身保持系统光标）
    // ============================================================
    const torch = document.getElementById('torch');

    if (torch) {
        const moveCursor = (x, y) => {
            torch.style.left = `${x}px`;
            torch.style.top = `${y}px`;
        };
        moveCursor(window.innerWidth / 2, window.innerHeight / 2);

        document.addEventListener('mousemove', (e) => {
            moveCursor(e.clientX, e.clientY);
        });
    }

    const setTorchMode = (isActive) => {
        if (!torch) return;
        const gradient = isActive
            ? 'radial-gradient(circle, var(--torch-active-strong) 0%, var(--torch-active-soft) 50%, transparent 70%)'
            : 'radial-gradient(circle, var(--torch-idle-strong) 0%, var(--torch-idle-soft) 50%, transparent 70%)';
        if (isActive) {
            torch.style.width = '600px';
            torch.style.height = '600px';
            torch.style.background = gradient;
        } else {
            torch.style.width = '400px';
            torch.style.height = '400px';
            torch.style.background = gradient;
        }
    };

    // ============================================================
    // State
    // ============================================================
    const START_DATE = new Date('2026-01-01T00:00:00');
    const RELATIONSHIP_START = new Date('2009-12-10T00:00:00');
    const EMPTY_FUTURE_START = new Date('2025-12-25T00:00:00');
    const WEEKDAYS_ZH = '日一二三四五六';
    const TS = window.Typeset;

    // "今天"：默认取本机日期；URL 加 ?date=YYYY-MM-DD 可预览指定日期的画廊（与首页一致）
    const PREVIEW_DATE = (() => {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(new URLSearchParams(window.location.search).get('date') || '');
        return match ? new Date(+match[1], +match[2] - 1, +match[3]) : null;
    })();
    const getToday = () => {
        const d = PREVIEW_DATE ? new Date(PREVIEW_DATE) : new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    };
    const isMobileLayout = () => window.matchMedia('(max-width: 600px)').matches;
    let currentMonth = new Date(START_DATE);
    let selectedDate = new Date(START_DATE);
    let galleryData = [];
    let dataByDate = {};
    const cardByDate = new Map();
    let resizeTimer = null;
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
        const normalized = hex.length === 4
            ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
            : hex;
        const int = Number.parseInt(normalized.slice(1), 16);
        return {
            r: (int >> 16) & 255,
            g: (int >> 8) & 255,
            b: int & 255
        };
    };

    const mixColor = (a, b, ratio) => ({
        r: Math.round(a.r * (1 - ratio) + b.r * ratio),
        g: Math.round(a.g * (1 - ratio) + b.g * ratio),
        b: Math.round(a.b * (1 - ratio) + b.b * ratio)
    });

    const toRgba = (color, alpha) => (
        `rgba(${color.r}, ${color.g}, ${color.b}, ${clamp(alpha, 0, 1)})`
    );

    const getBaseTint = () => {
        if (!baseTint) {
            const cssValue = getComputedStyle(document.documentElement)
                .getPropertyValue('--bg-color');
            baseTint = parseHexColor(cssValue) || { r: 26, g: 11, b: 42 };
        }
        return baseTint;
    };

    const setBgBlurImage = (filename) => {
        if (!bgBlur) return;
        const value = filename ? `url('../images/${filename}')` : 'none';
        bgBlur.style.setProperty('--bg-blur-image', value);
    };

    const setBgBlurOverlay = (tone) => {
        if (!bgBlur || !tone) return;
        const base = getBaseTint();
        const toned = mixColor(tone, base, 0.55);
        const strong = toRgba(toned, 0.45);
        const soft = toRgba(toned, 0.25);
        const deep = toRgba(base, 0.9);
        bgBlur.style.setProperty(
            '--bg-blur-overlay',
            `radial-gradient(circle at 20% 20%, ${strong} 0%, ${soft} 45%, ${deep} 78%)`
        );
    };

    const resetBgBlurOverlay = () => {
        setBgBlurOverlay(getBaseTint());
    };

    const clearBgBlur = () => {
        setBgBlurImage(null);
        resetBgBlurOverlay();
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
            const alpha = data[i + 3];
            if (alpha < 40) continue;

            const red = data[i];
            const green = data[i + 1];
            const blue = data[i + 2];
            const luma = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
            const max = Math.max(red, green, blue);
            const min = Math.min(red, green, blue);
            const chroma = max - min;
            const saturation = chroma / 255;
            const lumaWeight = 1 - Math.abs(luma - 128) / 128;
            const weight = Math.max(0.1, lumaWeight) * (0.4 + saturation);

            r += red * weight;
            g += green * weight;
            b += blue * weight;
            total += weight;
        }

        if (!total) return null;
        return {
            r: Math.round(r / total),
            g: Math.round(g / total),
            b: Math.round(b / total)
        };
    };

    const applyImageTone = (filename) => {
        if (!bgBlur || !filename) return;
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
            if (tone) {
                bgToneCache.set(filename, tone);
                setBgBlurOverlay(tone);
            } else {
                resetBgBlurOverlay();
            }
        };
        img.onerror = () => {
            if (requestId !== bgToneRequestId) return;
            resetBgBlurOverlay();
        };
    };

    // ============================================================
    // Theme Toggle
    // ============================================================
    const themeButtons = document.querySelectorAll('.theme-btn');
    const THEME_STORAGE_KEY = 'love-minnie-theme-v3'; // v3: Reset to force seasonal auto-detection
    const THEME_SET = new Set(['winter', 'spring', 'summer', 'autumn']);

    const getSeasonalTheme = () => {
        const month = getToday().getMonth(); // 0-11
        // Spring: March (2), April (3), May (4)
        if (month >= 2 && month <= 4) return 'spring';
        // Summer: June (5), July (6), August (7)
        if (month >= 5 && month <= 7) return 'summer';
        // Autumn: September (8), October (9), November (10)
        if (month >= 8 && month <= 10) return 'autumn';
        // Winter: December (11), January (0), February (1)
        return 'winter';
    };

    const applyTheme = (theme, options = {}) => {
        const { persist = true } = options;
        const nextTheme = THEME_SET.has(theme) ? theme : getSeasonalTheme();
        document.documentElement.dataset.theme = nextTheme;
        themeButtons.forEach(btn => {
            const isActive = btn.dataset.theme === nextTheme;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });

        if (persist) {
            try {
                localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
            } catch (err) {
                console.warn('Theme persistence failed:', err);
            }
        }

        baseTint = null;
        const dateStr = selectedDate ? formatDateISO(selectedDate) : null;
        const item = dateStr ? dataByDate[dateStr] : null;
        if (item?.filename) {
            applyImageTone(item.filename);
        } else {
            resetBgBlurOverlay();
        }
    };

    const initTheme = () => {
        let storedTheme = null;
        try {
            storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        } catch (err) {
            storedTheme = null;
        }

        const hasStoredTheme = THEME_SET.has(storedTheme);
        const initialTheme = hasStoredTheme ? storedTheme : getSeasonalTheme();

        // Only persist if it was already stored (user preference). 
        // If it's the default seasonal theme, don't save it so it auto-updates next season.
        applyTheme(initialTheme, { persist: hasStoredTheme });
    };

    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
    });

    // ============================================================
    // Initialize
    // ============================================================
    const getEmbeddedData = () => (
        Array.isArray(window.__GALLERY_DATA__) ? window.__GALLERY_DATA__ : null
    );

    const loadGalleryData = () => {
        const embedded = getEmbeddedData();
        if (embedded) return Promise.resolve(embedded);

        return fetch('data.json')
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Failed to load data.json (${res.status})`);
                }
                return res.json();
            })
            .catch(err => {
                const fallback = getEmbeddedData();
                if (fallback) return fallback;
                return Promise.reject(err);
            });
    };

    initTheme();

    loadGalleryData()
        .then(data => {
            galleryData = data.map((item, index) => {
                let dateObj = item.date ? new Date(item.date) : null;
                if (!dateObj || Number.isNaN(dateObj.getTime())) {
                    dateObj = new Date(START_DATE);
                    dateObj.setDate(START_DATE.getDate() + index);
                }
                const dateStr = formatDateISO(dateObj);
                return {
                    ...item,
                    date: dateStr,
                    dateObj
                };
            }).sort((a, b) => b.dateObj - a.dateObj);

            dataByDate = {};
            galleryData.forEach(item => {
                dataByDate[item.date] = item;
            });

            const realToday = getToday();
            const todayStr = formatDateISO(realToday);

            let initialDate = null;

            // 1. First priority: Check if today has artwork
            if (dataByDate[todayStr]) {
                initialDate = realToday;
            } else {
                // 2. Second priority: Find the most recent artwork that's <= today
                //    (galleryData is sorted newest first, so find the first one <= today)
                const pastItems = galleryData.filter(item => item.dateObj <= realToday);
                if (pastItems.length > 0) {
                    initialDate = pastItems[0].dateObj; // Most recent past artwork
                } else if (galleryData.length > 0) {
                    // 3. Fallback: If all artwork is in the future, show the earliest upcoming
                    const futureItems = [...galleryData].sort((a, b) => a.dateObj - b.dateObj);
                    initialDate = futureItems[0].dateObj;
                }
            }

            if (!initialDate) {
                // No artwork at all, show current month empty state
                currentMonth = new Date(realToday);
                renderCalendar();
                renderTimeline();
                showEmptyState({ mode: getEmptyMode(realToday), date: realToday, scope: 'month' });
                return;
            }

            selectedDate = new Date(initialDate);
            currentMonth = new Date(initialDate);

            renderCalendar();
            renderTimeline();
            updateMonthView({ anchorDate: selectedDate });
        })
        .catch(err => {
            console.error('Error loading data:', err);
            showEmptyState({ mode: getEmptyMode(START_DATE), date: START_DATE, scope: 'month' });
        });

    // ============================================================
    // Event Listeners
    // ============================================================
    // 日历侧栏：只有宽屏桌面默认展开；手机（底部抽屉）和平板（浮层）默认收起。
    // HTML 里不再写死 open，避免加载过程中日历先盖住画廊首屏再滑走。
    if (calendarSidebar) {
        const openByDefault = window.matchMedia('(min-width: 1025px)').matches;
        calendarSidebar.style.transition = 'none';
        calendarSidebar.classList.toggle('open', openByDefault);
        document.body.classList.toggle('sidebar-closed', !openByDefault);
        toggleCalendarBtn?.classList.toggle('active', openByDefault);
        void calendarSidebar.offsetHeight;
        calendarSidebar.style.transition = '';
    }

    prevMonthBtn.addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        renderCalendar();
        updateMonthView();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        renderCalendar();
        updateMonthView();
    });

    toggleCalendarBtn.addEventListener('click', () => {
        // 手机上顶部的日历图标与底栏"日历"是同一个抽屉
        if (isMobileLayout()) {
            document.getElementById('nav-calendar')?.click();
            return;
        }
        calendarSidebar.classList.toggle('open');
        toggleCalendarBtn.classList.toggle('active');
        document.body.classList.toggle('sidebar-closed', !calendarSidebar.classList.contains('open'));

        // 在动画过程中持续刷新布局，消除"先错后对"的顿挫感
        // 使用 requestAnimationFrame 循环，持续 500ms
        const startTime = performance.now();
        const animationDuration = 500;

        const smoothResize = () => {
            resizeAllGalleryItems();
            layoutHero();
            if (performance.now() - startTime < animationDuration) {
                requestAnimationFrame(smoothResize);
            }
        };
        requestAnimationFrame(smoothResize);
    });

    // 随机重温：从历史画信里随机抽一封打开
    const memoryLaneBtn = document.getElementById('memory-lane-btn');
    if (memoryLaneBtn) {
        memoryLaneBtn.addEventListener('click', () => {
            if (!galleryData.length) return;
            const todayISO = formatDateISO(getToday());
            const pool = galleryData.filter(d => d.date !== todayISO);
            const source = pool.length ? pool : galleryData;
            const pick = source[Math.floor(Math.random() * source.length)];
            selectDate(new Date(pick.date), { scroll: false });
            openDetail(pick);
        });
        memoryLaneBtn.addEventListener('mouseenter', () => setTorchMode(true));
        memoryLaneBtn.addEventListener('mouseleave', () => setTorchMode(false));
    }

    timelinePrev.addEventListener('click', () => {
        timelineContainer.scrollBy({ left: -200, behavior: 'smooth' });
    });

    timelineNext.addEventListener('click', () => {
        timelineContainer.scrollBy({ left: 200, behavior: 'smooth' });
    });

    window.addEventListener('resize', () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
            resizeAllGalleryItems();
            layoutHero();
            if (detailModal?.classList.contains('open')) fitDetailTitle();
        }, 150);
    });

    document.addEventListener('keydown', (e) => {
        const isModalOpen = detailModal && detailModal.classList.contains('open');
        if (isModalOpen) {
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
                const offset = e.key === 'ArrowLeft' ? -1 : 1;
                const newDate = new Date(selectedDate);
                newDate.setDate(newDate.getDate() + offset);
                const dateStr = formatDateISO(newDate);
                const item = dataByDate[dateStr];
                if (item) {
                    selectDate(newDate, { scroll: false });
                    openDetail(item);
                } else {
                    closeDetail();
                    selectDate(newDate, { scroll: false });
                }
                return;
            }
        }

        if (e.key === 'ArrowLeft') {
            navigateDay(-1);
        } else if (e.key === 'ArrowRight') {
            navigateDay(1);
        }
    });

    if (detailClose) {
        detailClose.addEventListener('click', closeDetail);
    }

    if (detailModal) {
        detailModal.addEventListener('click', (e) => {
            if (e.target === detailModal) {
                closeDetail();
            }
        });
    }

    // ============================================================
    // Calendar Rendering
    // ============================================================
    function renderCalendar() {
        calendarDays.innerHTML = '';

        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        monthLabel.textContent = `${year}年${month + 1}月`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const today = getToday();

        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'day-cell empty';
            calendarDays.appendChild(emptyCell);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const cellDate = new Date(year, month, day);
            const dateStr = formatDateISO(cellDate);
            const hasContent = dataByDate[dateStr] !== undefined;
            const isFuture = cellDate > today && !hasContent;
            const isSelected = formatDateISO(cellDate) === formatDateISO(selectedDate);
            const isToday = formatDateISO(cellDate) === formatDateISO(today);
            const weekIndex = Math.floor((firstDay + day - 1) / 7);

            const cell = document.createElement('div');
            cell.className = 'day-cell';
            cell.dataset.date = dateStr;
            cell.classList.add('reveal');
            cell.style.setProperty('--reveal-delay', `${weekIndex * 70}ms`);

            if (hasContent) cell.classList.add('has-content');
            if (isFuture) cell.classList.add('future');
            if (isSelected) cell.classList.add('selected');
            if (isToday) cell.classList.add('today');

            const monthLabelNum = month + 1;
            if (isFuture) {
                cell.innerHTML =
                    `<span class="day-num">${day}</span>` +
                    '<span class="seed-icon" aria-hidden="true"><img src="images/sunflower.svg" class="sunflower-icon" alt=""></span>';
                cell.setAttribute('aria-label', `${monthLabelNum}月${day}日，尚未上画`);
            } else {
                cell.innerHTML = `<span class="day-num">${day}</span>`;
                cell.setAttribute(
                    'aria-label',
                    hasContent ? `${monthLabelNum}月${day}日，有画作` : `${monthLabelNum}月${day}日`
                );
            }

            cell.addEventListener('click', () => {
                const item = dataByDate[dateStr];
                if (window.innerWidth <= 1024) {
                    // 手机、平板：收起日历（连同遮罩、滚动锁、底栏状态一起复位）
                    closeCalendarPanel();
                }
                if (item && isMobileLayout()) {
                    // 手机上点日期就是想看那天：直接打开那一封
                    selectDate(cellDate, { scroll: false });
                    openDetail(item);
                    return;
                }
                selectDate(cellDate);
            });

            calendarDays.appendChild(cell);
        }
    }

    // ============================================================
    // Timeline Rendering
    // ============================================================
    function renderTimeline() {
        timelineContainer.innerHTML = '';

        // 按日期升序排列（早的在前）
        const allItems = [...galleryData].sort((a, b) => a.dateObj - b.dateObj);

        // 在最后添加未来的占位符
        const lastDate = allItems.length > 0
            ? new Date(allItems[allItems.length - 1].dateObj)
            : new Date(START_DATE);

        for (let i = 1; i <= 5; i++) {
            const futureDate = new Date(lastDate);
            futureDate.setDate(lastDate.getDate() + i);
            allItems.push({
                date: formatDateISO(futureDate),
                dateObj: futureDate,
                isFuture: true
            });
        }

        const selectedKey = formatDateISO(selectedDate);
        const selectedIndex = allItems.findIndex(item => item.date === selectedKey);

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
                img.loading = Math.abs(index - Math.max(selectedIndex, 0)) <= 24 ? 'eager' : 'lazy';
                img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
                img.addEventListener('error', () => thumb.classList.add('is-error'));
                if (timelineHydrated) hydrateThumb(img);
                thumb.appendChild(img);

                // 日期角标（"6.12"），比序号更直观
                const badge = document.createElement('span');
                badge.className = 'thumb-badge';
                badge.textContent = `${item.dateObj.getMonth() + 1}.${item.dateObj.getDate()}`;
                thumb.appendChild(badge);

                thumb.addEventListener('click', () => {
                    // Check if modal is open to determine behavior
                    const isModalOpen = document.body.classList.contains('modal-open');

                    selectDate(new Date(item.date), { scroll: !isModalOpen });

                    if (isModalOpen) {
                        // If in theater mode, just update content
                        openDetail(item);
                    }
                });
            }

            if (formatDateISO(selectedDate) === item.date) {
                thumb.classList.add('selected');
            }

            timelineContainer.appendChild(thumb);
        });
    }

    let timelineHydrated = false;

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

    function getItemsForMonth(date) {
        return galleryData.filter(item =>
            item.dateObj.getFullYear() === date.getFullYear() &&
            item.dateObj.getMonth() === date.getMonth()
        );
    }

    function getItemsForWeek(date) {
        const { start, end } = getWeekBounds(date);
        const startKey = toUtcDay(start);
        const endKey = toUtcDay(end);
        return galleryData.filter(item => {
            const dayKey = toUtcDay(item.dateObj);
            return dayKey >= startKey && dayKey <= endKey;
        });
    }

    function getEmptyScope(date) {
        if (!date) return 'day';
        if (!getItemsForMonth(date).length) return 'month';
        if (!getItemsForWeek(date).length) return 'week';
        return 'day';
    }

    function updateMonthView(options = {}) {
        const { anchorDate = null } = options;
        const items = getItemsForMonth(currentMonth);
        // 今日画信置顶：当前月包含最新一封时，把它从瀑布流里抽出来单独展示
        const heroItem = renderTodayHero();
        const gridItems = heroItem ? items.filter(item => item.date !== heroItem.date) : items;

        updateMonthDigest(items);

        if (!items.length) {
            clearBgBlur();
            showEmptyState({ mode: getEmptyMode(currentMonth), date: currentMonth, scope: 'month' });
            updateDateCapsuleForMonth(currentMonth);
            return;
        }

        renderGallery(gridItems, { allowEmpty: !!heroItem });

        const anchorDateStr = anchorDate ? formatDateISO(new Date(anchorDate)) : null;
        const hasAnchor = anchorDateStr && items.some(item => item.date === anchorDateStr);
        const targetDate = hasAnchor ? new Date(anchorDate) : items[0].dateObj;
        selectDate(targetDate, { scroll: false, skipMonthUpdate: true });
    }

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

    function signHtml(parts) {
        return HEART_SVG + (parts.ritual ? unit('今日份爱你') : '');
    }

    // 侧栏本月小结："9月 · 已收到 25 封画信"
    function updateMonthDigest(items) {
        const digest = document.getElementById('month-digest');
        if (!digest) return;
        const month = currentMonth.getMonth() + 1;
        const today = getToday();
        const isCurrentMonth = currentMonth.getFullYear() === today.getFullYear()
            && currentMonth.getMonth() === today.getMonth();
        const isFuture = toUtcDay(currentMonth) > toUtcDay(today) && !items.length;

        if (isFuture || !items.length) {
            digest.innerHTML = unit(`${month}月`) + SEP + unit(isFuture ? '花期未至' : '这个月还没有画信');
            return;
        }
        const verb = isCurrentMonth ? '已收到' : '收藏了';
        digest.innerHTML = unit(`${month}月`) + SEP + unit(`${verb} <strong>${items.length}</strong> 封画信`);
    }

    // ============================================================
    // 今日画信（置顶卡）
    // 横图竖图同一套版式，只按画的比例分配空间：
    //   宽卡片：画在左、信在右，信笺一栏至少 340px；
    //   窄卡片（手机、平板竖屏）：画在上、信在下，竖图限高，保证日期和那句话在首屏。
    // 今天的画还没上时，展示最近一封，并注明"今天这封还在路上"。
    // ============================================================
    function getHeroPick() {
        const today = getToday();
        const todayItem = dataByDate[formatDateISO(today)];
        if (todayItem) return { item: todayItem, isToday: true };
        const latest = galleryData.find(d => d.dateObj <= today);
        return latest ? { item: latest, isToday: false } : null;
    }

    function layoutHero() {
        const hero = document.getElementById('today-hero');
        const img = document.getElementById('today-hero-img');
        if (!hero || hero.hidden || !img) return;
        // 画还没加载完（手机网慢）时先按 4:3 占位，把上下 / 左右版式先定下来；加载完再按真实比例重算
        const known = img.naturalWidth > 0;
        const ratio = known ? img.naturalWidth / img.naturalHeight : 4 / 3;
        const portrait = ratio < 0.95;
        hero.classList.toggle('is-portrait', known && portrait);
        hero.classList.toggle('is-landscape', known && !portrait);

        const heroWidth = hero.clientWidth;
        const stacked = heroWidth < 720;
        hero.classList.toggle('is-stacked', stacked);
        const vh = window.innerHeight;
        let artW;
        if (stacked) {
            const maxW = heroWidth - 32;
            const maxH = portrait ? Math.min(vh * 0.52, 520) : vh * 0.46;
            artW = Math.min(maxW, maxH * ratio);
        } else {
            const pad = 28;
            const availW = heroWidth - 340 - pad * 2;
            const maxH = portrait
                ? Math.min(Math.max(vh - 220, 440), 740)
                : Math.min(Math.max(vh - 330, 300), 560);
            const maxW = portrait ? availW : Math.min(availW, heroWidth * 0.64 - pad * 2);
            artW = Math.min(maxW, maxH * ratio);
        }
        artW = Math.max(120, Math.floor(artW));
        hero.style.setProperty('--art-w', `${artW}px`);
        hero.style.setProperty('--art-h', `${Math.round(artW / ratio)}px`);

        const titleEl = document.getElementById('today-hero-title');
        if (titleEl && !titleEl.classList.contains('is-long')) {
            const chars = Array.from(titleEl.textContent.replace(/\s/g, '')).length;
            TS.fit(titleEl, {
                max: stacked ? (isMobileLayout() ? 34 : 40) : 44,
                min: stacked ? 22 : 26,
                maxLines: chars <= 10 ? 1 : 2
            });
        }
    }

    function renderTodayHero(forcedPick) {
        const hero = document.getElementById('today-hero');
        if (!hero) return null;

        const pick = forcedPick || getHeroPick();
        const sameMonth = pick
            && pick.item.dateObj.getFullYear() === currentMonth.getFullYear()
            && pick.item.dateObj.getMonth() === currentMonth.getMonth();
        if (!sameMonth) {
            hero.hidden = true;
            return null;
        }

        const { item, isToday } = pick;
        const d = item.dateObj;
        const daysAgo = diffDays(d, getToday());
        const label = isToday ? '今天' : (daysAgo === 1 ? '昨天' : '最近一封');

        document.getElementById('today-hero-date').innerHTML =
            `<span class="ts-u is-today">${label}</span>` + SEP +
            unit(`${d.getMonth() + 1}月${d.getDate()}日`) + SEP +
            unit(`星期${WEEKDAYS_ZH[d.getDay()]}`);

        const parts = letterParts(item);
        const titleEl = document.getElementById('today-hero-title');
        titleEl.innerHTML = TS.html(parts.title);
        titleEl.classList.toggle('is-long', parts.isLong);
        if (parts.isLong) TS.unfit(titleEl);
        document.getElementById('today-hero-sign').innerHTML = signHtml(parts);
        document.getElementById('today-hero-days').innerHTML =
            unit(`在一起的第 <span class="num">${getDayNumber(d)}</span> 天`);
        const note = document.getElementById('today-hero-note');
        note.hidden = isToday;
        note.innerHTML = isToday ? '' : unit('今天这封还在路上');

        const img = document.getElementById('today-hero-img');
        img.onload = layoutHero;
        img.src = `images/${item.filename}`;
        img.alt = getArtworkLabel(item);
        hero.setAttribute('aria-label', `查看${label}的画：${getArtworkLabel(item)}`);
        hero.style.setProperty('--hero-bg', `url("${img.src}")`);

        if (!hero.dataset.bound) {
            const openHero = () => {
                const it = galleryData.find(g => g.date === hero.dataset.date);
                if (!it) return;
                selectDate(new Date(it.date), { scroll: false });
                openDetail(it);
            };
            hero.addEventListener('click', openHero);
            hero.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openHero();
                }
            });
            hero.addEventListener('mouseenter', () => setTorchMode(true));
            hero.addEventListener('mouseleave', () => setTorchMode(false));
            hero.dataset.bound = '1';
        }
        hero.dataset.date = item.date;
        hero.hidden = false;
        layoutHero();
        return item;
    }

    // ============================================================
    // Gallery Rendering
    // ============================================================
    function renderGallery(items = galleryData, options = {}) {
        if (!galleryGrid) return;
        galleryGrid.innerHTML = '';
        cardByDate.clear();

        if (!items.length) {
            // Hero 单独展示今天时，当月仅此一张也不算空
            if (options.allowEmpty) {
                if (emptyState) emptyState.style.display = 'none';
                return;
            }
            showEmptyState({ mode: getEmptyMode(currentMonth), date: currentMonth, scope: 'month' });
            return;
        }

        if (emptyState) {
            emptyState.style.display = 'none';
        }
        if (galleryGrid) {
            galleryGrid.style.display = 'grid';
        }

        items.forEach((item, index) => {
            const card = createGalleryCard(item, index);
            // 入场 stagger：逐张浮现，结束后清理避免干扰 hover 动效
            card.style.animationDelay = `${Math.min(index * 55, 660)}ms`;
            card.classList.add('card-enter');
            card.addEventListener('animationend', () => {
                card.classList.remove('card-enter');
                card.style.animationDelay = '';
            }, { once: true });
            galleryGrid.appendChild(card);
            cardByDate.set(item.date, card);
        });

        requestAnimationFrame(resizeAllGalleryItems);
    }

    function createGalleryCard(item, index) {
        const card = document.createElement('article');
        card.className = 'gallery-card';
        card.dataset.date = item.date;
        card.dataset.index = index;
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', getArtworkLabel(item));

        const media = document.createElement('div');
        media.className = 'gallery-media';

        const img = document.createElement('img');
        img.src = `images/${item.filename}`;
        img.alt = getArtworkLabel(item);
        img.loading = 'lazy';
        img.decoding = 'async';

        img.addEventListener('load', () => {
            const isLandscape = img.naturalWidth >= img.naturalHeight;
            card.classList.toggle('is-landscape', isLandscape);
            card.classList.toggle('is-portrait', !isLandscape);
            card.style.setProperty('--card-ratio', `${img.naturalWidth} / ${img.naturalHeight}`);
            requestAnimationFrame(() => resizeMasonryItem(card));
        });

        img.addEventListener('error', () => {
            media.style.background = 'rgba(0, 0, 0, 0.55)';
        });

        media.appendChild(img);

        const meta = document.createElement('div');
        meta.className = 'gallery-meta';
        const itemDate = new Date(item.date);
        // hover 给情话，不给编号：编号是档案信息，挪去了详情页副行
        const prefixText = `${itemDate.getMonth() + 1}月${itemDate.getDate()}日 · 第 ${getDayNumber(itemDate)} 天`;
        const titleText = letterParts(item).title || item.title || formatCardDateDisplay(itemDate);
        meta.innerHTML = `
            <div class="gallery-meta-line">
                <span class="meta-prefix">${escapeHtml(prefixText)}</span>
                <span class="meta-title">${escapeHtml(titleText)}</span>
            </div>
        `;

        card.appendChild(media);
        card.appendChild(meta);

        card.addEventListener('mouseenter', () => setTorchMode(true));
        card.addEventListener('mouseleave', () => setTorchMode(false));

        card.addEventListener('click', () => {
            selectDate(new Date(item.date), { scroll: false });
            openDetail(item);
        });

        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectDate(new Date(item.date), { scroll: false });
                openDetail(item);
            }
        });

        return card;
    }

    function resizeMasonryItem(card) {
        if (!galleryGrid || !card) return;
        const styles = window.getComputedStyle(galleryGrid);
        const rowHeight = parseInt(styles.getPropertyValue('grid-auto-rows'), 10) || 8;
        const rowGap = parseInt(styles.getPropertyValue('row-gap'), 10) || 18;
        const media = card.querySelector('.gallery-media');
        const mediaHeight = media ? media.getBoundingClientRect().height : card.getBoundingClientRect().height;
        const cardStyles = window.getComputedStyle(card);
        const borders = (parseFloat(cardStyles.borderTopWidth) || 0) + (parseFloat(cardStyles.borderBottomWidth) || 0);
        const rowSpan = Math.ceil((mediaHeight + borders + rowGap) / (rowHeight + rowGap));
        card.style.gridRowEnd = `span ${rowSpan}`;
    }

    function resizeAllGalleryItems() {
        const cards = galleryGrid ? Array.from(galleryGrid.children) : [];
        cards.forEach(card => resizeMasonryItem(card));
    }

    // ============================================================
    // Select & Display Day
    // ============================================================
    function selectDate(date, options = {}) {
        const { scroll = true, skipMonthUpdate = false } = options;
        selectedDate = new Date(date);
        const dateStr = formatDateISO(selectedDate);
        const item = dataByDate[dateStr];

        if (!item) {
            // 没有画的日子：整月都没画才换成空状态；否则只轻提示一句，不清空这个月的画
            const monthHasItems = getItemsForMonth(currentMonth).length > 0;
            if (monthHasItems) {
                const isFutureDay = toUtcDay(selectedDate) > toUtcDay(getToday());
                const phrase = isFutureDay ? pickEmptyPhrase('day').zh : '这一天没有画信';
                showToast(unit(`${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日`) + SEP + unit(escapeHtml(phrase)));
            } else {
                const emptyScope = getEmptyScope(selectedDate);
                showEmptyState({ mode: getEmptyMode(selectedDate), date: selectedDate, scope: emptyScope });
            }

            // 仍然更新选中状态
            document.querySelectorAll('.day-cell.selected').forEach(el => el.classList.remove('selected'));
            const targetCell = document.querySelector(`.day-cell[data-date="${dateStr}"]`);
            if (targetCell) targetCell.classList.add('selected');

            updateDateCapsuleForDate(selectedDate);
            flashDateCapsule();

            if (!monthHasItems) clearBgBlur();
            return;
        }

        // 有内容时隐藏空状态
        if (emptyState) emptyState.style.display = 'none';

        document.querySelectorAll('.day-cell.selected').forEach(el => el.classList.remove('selected'));
        const targetCell = document.querySelector(`.day-cell[data-date="${dateStr}"]`);
        if (targetCell) targetCell.classList.add('selected');

        document.querySelectorAll('.timeline-thumb.selected').forEach(el => el.classList.remove('selected'));
        const targetThumb = document.querySelector(`.timeline-thumb[data-date="${dateStr}"]`);
        if (targetThumb) {
            targetThumb.classList.add('selected');
            targetThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }

        document.querySelectorAll('.gallery-card.selected').forEach(el => el.classList.remove('selected'));
        const targetCard = cardByDate.get(dateStr);
        if (targetCard) {
            targetCard.classList.add('selected');
            if (scroll) {
                targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else if (scroll) {
            // 今天那张由 Hero 承载，不在瀑布流里：选中今天时滚回顶部的 Hero
            const hero = document.getElementById('today-hero');
            if (hero && !hero.hidden && hero.dataset.date === dateStr) {
                hero.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

        if (bgBlur) {
            setBgBlurImage(item.filename);
            applyImageTone(item.filename);
        }

        updateDateCapsule(item);

        const monthChanged = currentMonth.getMonth() !== selectedDate.getMonth() ||
            currentMonth.getFullYear() !== selectedDate.getFullYear();

        if (monthChanged) {
            currentMonth = new Date(selectedDate);
            renderCalendar();
            if (!skipMonthUpdate) {
                updateMonthView({ anchorDate: selectedDate });
            }
        }
    }

    function updateDateCapsuleForDate(date) {
        if (!dateCapsule || !date) return;
        const d = new Date(date);
        const dayNum = getDayNumber(d);
        const shortMonth = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
        dateCapsule.textContent = `Day ${dayNum} · ${shortMonth} ${d.getDate()}`;
    }

    let toastTimer = null;
    function showToast(html) {
        const toast = document.getElementById('lm-toast');
        if (!toast) return;
        toast.innerHTML = html;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
    }

    function flashDateCapsule() {
        if (!dateCapsule) return;
        dateCapsule.classList.remove('capsule-flash');
        void dateCapsule.offsetWidth;
        dateCapsule.classList.add('capsule-flash');
    }

    function updateDateCapsule(item) {
        if (!item?.date) return;
        updateDateCapsuleForDate(new Date(item.date));
    }

    function updateDateCapsuleForMonth(date) {
        if (!dateCapsule || !date) return;
        dateCapsule.textContent = formatMonthDisplay(date);
    }

    function getEmptyMode(date) {
        return toUtcDay(date) >= toUtcDay(EMPTY_FUTURE_START) ? 'future' : 'past';
    }

    const EMPTY_PHRASES = {
        day: [
            { zh: '这一天还在路上', en: 'This day is still on its way.' },
            { zh: '这一天尚未开启', en: 'This day has not opened yet.' },
            { zh: '这一天先留白', en: 'Let this day stay blank for now.' },
            { zh: '这一天的花还含苞', en: 'The bloom of this day is still closed.' },
            { zh: '这一天等你点亮', en: 'This day is waiting for your light.' },
            { zh: '这一天慢慢靠近', en: 'This day is quietly drawing near.' },
            { zh: '这一天的故事未翻页', en: 'This day\'s story hasn\'t turned the page.' },
            { zh: '这一天轻轻打盹', en: 'This day is taking a soft nap.' }
        ],
        week: [
            { zh: '这一周正在靠近', en: 'This week is drawing near.' },
            { zh: '这一周仍在酝酿', en: 'This week is still brewing.' },
            { zh: '这一周慢慢生长', en: 'This week is growing slowly.' },
            { zh: '这一周暂时留白', en: 'This week remains blank for now.' },
            { zh: '这一周在准备亮相', en: 'This week is preparing to appear.' },
            { zh: '这一周留待花开', en: 'This week is saved for blooming.' },
            { zh: '这一周还在路上', en: 'This week is still on its way.' },
            { zh: '这一周轻轻合上', en: 'This week is softly folded away.' }
        ],
        month: [
            { zh: '这个月仍在沉睡', en: 'This month is still asleep.' },
            { zh: '这个月尚未抵达', en: 'This month has not arrived yet.' },
            { zh: '这个月的花期未到', en: 'The bloom of this month hasn\'t come.' },
            { zh: '这个月缓慢靠近', en: 'This month is slowly approaching.' },
            { zh: '这个月先把灯藏好', en: 'This month keeps its lights tucked away.' },
            { zh: '这个月的故事未展开', en: 'The story of this month hasn\'t unfolded yet.' },
            { zh: '这个月留给未来', en: 'This month is saved for later.' },
            { zh: '这个月正在酝酿', en: 'This month is still brewing.' }
        ]
    };

    const lastEmptyPhraseIndex = {
        day: -1,
        week: -1,
        month: -1
    };

    const pickEmptyPhrase = (scope) => {
        const list = EMPTY_PHRASES[scope] || EMPTY_PHRASES.day;
        if (!list.length) return { zh: '', en: '' };
        let nextIndex = Math.floor(Math.random() * list.length);
        if (list.length > 1 && nextIndex === lastEmptyPhraseIndex[scope]) {
            nextIndex = (nextIndex + 1) % list.length;
        }
        lastEmptyPhraseIndex[scope] = nextIndex;
        return list[nextIndex];
    };

    function showEmptyState(config = {}) {
        const { mode = 'future', date = currentMonth, scope = 'month' } = config;
        if (!emptyState) return;
        emptyState.style.display = 'flex';
        if (galleryGrid) {
            galleryGrid.innerHTML = '';
            galleryGrid.style.display = 'none';
        }

        const resolvedScope = ['day', 'week', 'month'].includes(scope) ? scope : 'month';
        const zhDateText = resolvedScope === 'day'
            ? formatDateDisplayZh(date)
            : resolvedScope === 'week'
                ? formatWeekRangeZh(date)
                : formatMonthDisplayZh(date);
        const enDateText = resolvedScope === 'day'
            ? formatDateDisplayEn(date)
            : resolvedScope === 'week'
                ? formatWeekRangeEn(date)
                : formatMonthDisplay(date);

        if (mode === 'future') {
            const phrase = pickEmptyPhrase(resolvedScope);
            if (emptyTitle) emptyTitle.textContent = '花期未至';
            if (emptyDateText) {
                emptyDateText.innerHTML = unit(escapeHtml(zhDateText)) + SEP + unit(escapeHtml(phrase.zh));
            }
            if (emptySubtext) {
                emptySubtext.textContent = `${enDateText} · ${phrase.en}`;
            }
        } else if (mode === 'past') {
            if (emptyTitle) emptyTitle.textContent = '旧梦微光';
            if (emptyDateText) {
                emptyDateText.innerHTML = unit(escapeHtml(zhDateText)) + SEP + unit('美好已成回忆');
            }
            if (emptySubtext) {
                emptySubtext.textContent = `${enDateText} · Those days now glow in memory.`;
            }
        } else {
            if (emptyTitle) emptyTitle.textContent = 'A seed waiting to bloom...';
            if (emptyDateText) {
                emptyDateText.textContent = `${formatDateDisplay(new Date(date))} — This memory is waiting to unfold...`;
            }
            if (emptySubtext) {
                emptySubtext.textContent = '';
            }
        }
    }

    // ============================================================
    // Navigation
    // ============================================================
    function navigateDay(offset) {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + offset);
        selectDate(newDate);
    }

    // ============================================================
    // Detail Modal
    // ============================================================
    let lastDetailFocus = null;

    function getDetailFocusable() {
        if (!detailModal) return [];
        const dialog = detailModal.querySelector('.detail-dialog') || detailModal;
        return [...dialog.querySelectorAll(
            'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )].filter(el => el.getAttribute('aria-hidden') !== 'true');
    }

    function setBackgroundInert(isInert) {
        if (!detailModal) return;
        [...document.body.children].forEach(el => {
            if (el === detailModal) return;
            // 影院模式仍允许底栏时间轴点选换画
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
        try {
            if (localStorage.getItem(SWIPE_HINT_KEY)) return;
            localStorage.setItem(SWIPE_HINT_KEY, '1');
        } catch (err) {
            // 存储不可用时本次会话内只提示一次
        }
        const hint = document.getElementById('detail-hint');
        if (!hint) return;
        hint.classList.add('is-visible');
        setTimeout(() => hint.classList.remove('is-visible'), 2600);
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

        // 先移除之前的方向类
        if (detailDialog) {
            detailDialog.classList.remove('is-portrait', 'is-landscape');
        }

        // 先绑定 onload，再切换 src，避免缓存图片时错过方向识别
        detailImage.onload = updateDetailOrientation;
        detailImage.src = `images/${item.filename}`;
        detailImage.alt = getArtworkLabel(item);
        // 弹窗信笺/图区的同图氛围底
        if (detailDialog) {
            detailDialog.style.setProperty('--detail-bg', `url("${detailImage.src}")`);
        }

        // 信笺：日期 → 第几天、第几封 → 主题 → 落款
        const d = item.dateObj instanceof Date ? item.dateObj : new Date(item.date);
        detailDate.innerHTML =
            unit(`${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`) + SEP +
            unit(`星期${WEEKDAYS_ZH[d.getDay()]}`);
        const detailSub = document.getElementById('detail-sub');
        if (detailSub) {
            detailSub.innerHTML =
                unit(`在一起的第 <span class="num">${getDayNumber(d)}</span> 天`) + SEP +
                unit(`第 <span class="num">${getChronoNo(item)}</span> 封画信`);
        }

        const parts = letterParts(item);
        detailTitle.innerHTML = TS.html(parts.title || '这是一个特别的日子');
        detailTitle.classList.toggle('is-long', parts.isLong);
        detailLetter.innerHTML = parts.rest ? TS.html(parts.rest) : '';
        if (detailDialog) detailDialog.classList.toggle('is-long-letter', parts.isLong || !!parts.rest);
        const detailSign = document.getElementById('detail-sign');
        if (detailSign) detailSign.innerHTML = signHtml(parts);

        const description = item.description ? item.description.trim() : '';
        detailDescription.innerHTML = description && description !== (item.loveLetter || '').trim()
            ? TS.html(description)
            : '';

        detailModal.classList.add('open');
        detailModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        if (!lastDetailFocus) {
            lastDetailFocus = document.activeElement;
        }
        setBackgroundInert(true);
        if (detailClose) {
            detailClose.focus();
        }
        if (detailImage.complete) {
            updateDetailOrientation();
        } else {
            fitDetailTitle();
        }
        // 手机上不显示胶卷条，就不去加载它的图
        if (!isMobileLayout()) hydrateTimeline();
        maybeShowSwipeHint();

        // Edit 是管理功能，只在 URL 带 ?admin=1 时显示，避免打扰观众视角
        const isAdminMode = new URLSearchParams(window.location.search).has('admin');
        let editBtn = document.getElementById('detail-edit');
        if (isAdminMode) {
            if (!editBtn) {
                editBtn = document.createElement('button');
                editBtn.id = 'detail-edit';
                editBtn.className = 'detail-action-btn';
                editBtn.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-edit"></use></svg>';
                editBtn.setAttribute('title', 'Review & Edit');

                // Insert before Close button
                const header = document.querySelector('.detail-header');
                if (header) {
                    header.appendChild(editBtn);
                }
            }

            editBtn.onclick = () => {
                window.location.href = `admin.html?date=${item.date}`;
            };
        } else if (editBtn) {
            editBtn.remove();
        }
    }

    function closeDetail() {
        if (!detailModal) return;
        detailModal.classList.remove('open');
        detailModal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
        setBackgroundInert(false);
        const restore = lastDetailFocus;
        lastDetailFocus = null;
        if (restore && typeof restore.focus === 'function' && document.contains(restore)) {
            restore.focus();
        }
    }

    // ============================================================
    // 移动端触摸滑动切换画作
    // ============================================================
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    const SWIPE_THRESHOLD = 50; // 最小滑动距离
    const SWIPE_RESTRAINT = 100; // 垂直方向最大偏移

    if (detailModal) {
        const detailMediaEl = detailModal.querySelector('.detail-media');
        
        detailModal.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        detailModal.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            handleSwipe();
        }, { passive: true });

        function handleSwipe() {
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;

            // 只处理水平滑动（垂直偏移不能太大）
            if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaY) < SWIPE_RESTRAINT) {
                if (deltaX > 0) {
                    // 右滑 -> 上一张
                    navigateDetailBySwipe(-1);
                } else {
                    // 左滑 -> 下一张
                    navigateDetailBySwipe(1);
                }
            }
        }

        function navigateDetailBySwipe(offset) {
            const currentDateStr = formatDateISO(selectedDate);
            
            // 获取所有有内容的日期，按日期排序
            const allDates = Object.keys(dataByDate).sort();
            const currentIndex = allDates.indexOf(currentDateStr);
            
            if (currentIndex === -1) return;
            
            const newIndex = currentIndex + offset;
            if (newIndex < 0 || newIndex >= allDates.length) {
                // 到达边界，可以添加震动反馈
                if (detailMediaEl) {
                    detailMediaEl.style.transform = offset > 0 ? 'translateX(-10px)' : 'translateX(10px)';
                    setTimeout(() => {
                        detailMediaEl.style.transform = '';
                    }, 150);
                }
                return;
            }
            
            const newDateStr = allDates[newIndex];
            const newItem = dataByDate[newDateStr];
            
            if (newItem) {
                // 添加滑动动画
                if (detailMediaEl) {
                    const direction = offset > 0 ? '-100%' : '100%';
                    detailMediaEl.style.transition = 'transform 0.25s ease-out, opacity 0.2s ease';
                    detailMediaEl.style.transform = `translateX(${direction})`;
                    detailMediaEl.style.opacity = '0';
                    
                    setTimeout(() => {
                        selectDate(new Date(newDateStr), { scroll: false });
                        openDetail(newItem);
                        
                        // 从另一侧滑入
                        const enterFrom = offset > 0 ? '100%' : '-100%';
                        detailMediaEl.style.transition = 'none';
                        detailMediaEl.style.transform = `translateX(${enterFrom})`;
                        detailMediaEl.style.opacity = '0';
                        
                        requestAnimationFrame(() => {
                            detailMediaEl.style.transition = 'transform 0.25s ease-out, opacity 0.2s ease';
                            detailMediaEl.style.transform = 'translateX(0)';
                            detailMediaEl.style.opacity = '1';
                        });
                    }, 200);
                } else {
                    selectDate(new Date(newDateStr), { scroll: false });
                    openDetail(newItem);
                }
            }
        }
    }

    // ============================================================
    // Utility Functions
    // ============================================================
    function formatDateISO(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function formatDateDisplay(date) {
        // Change to YYYY.MMM.D, e.g., 2026.Jan.2
        const year = date.getFullYear();
        const day = date.getDate();
        const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
        return `${year}.${monthShort}.${day}`;
    }

    function formatMonthDisplay(date) {
        const options = { year: 'numeric', month: 'long' };
        return date.toLocaleDateString('en-US', options);
    }

    function formatMonthDisplayZh(date) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        return `${year}年${month}月`;
    }

    function formatDateDisplayZh(date) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${year}年${month}月${day}日`;
    }

    function getArtworkThemeText(item) {
        const raw = String(item.loveLetter || item.title || item.description || '');
        const match = raw.match(/今日份爱你[,，、\s]*(.+)$/);
        if (match) return match[1].trim();
        return raw.replace(/^♥️\s*/, '').trim();
    }

    function getArtworkLabel(item) {
        const dateObj = item.dateObj instanceof Date ? item.dateObj : new Date(item.date);
        const dateLabel = formatDateDisplayZh(dateObj);
        const theme = getArtworkThemeText(item);
        return theme ? `${dateLabel}，${theme}` : dateLabel;
    }

    function formatDateDisplayEn(date) {
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function formatCardDateDisplay(date) {
        const year = date.getFullYear();
        const day = date.getDate();
        const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
        return `${year} ${monthShort} ${day}`;
    }

    function getWeekBounds(date) {
        const base = new Date(date);
        base.setHours(0, 0, 0, 0);
        const day = base.getDay();
        const diffToMonday = (day + 6) % 7;
        const start = new Date(base);
        start.setDate(base.getDate() - diffToMonday);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return { start, end };
    }

    function formatWeekRangeZh(date) {
        const { start, end } = getWeekBounds(date);
        const startYear = start.getFullYear();
        const endYear = end.getFullYear();
        const startMonth = start.getMonth() + 1;
        const endMonth = end.getMonth() + 1;
        const startDay = start.getDate();
        const endDay = end.getDate();

        if (startYear === endYear) {
            return `${startYear}年${startMonth}月${startDay}日-${endMonth}月${endDay}日`;
        }
        return `${startYear}年${startMonth}月${startDay}日-${endYear}年${endMonth}月${endDay}日`;
    }

    function formatWeekRangeEn(date) {
        const { start, end } = getWeekBounds(date);
        const startYear = start.getFullYear();
        const endYear = end.getFullYear();
        const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const startLabel = `${monthShort[start.getMonth()]} ${start.getDate()}`;
        const endLabel = `${monthShort[end.getMonth()]} ${end.getDate()}`;

        if (startYear === endYear) {
            return `${startLabel}-${endLabel}, ${startYear}`;
        }
        return `${startLabel}, ${startYear}-${endLabel}, ${endYear}`;
    }

    function toUtcDay(date) {
        return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    }

    function diffDays(start, end) {
        return Math.floor((toUtcDay(end) - toUtcDay(start)) / (1000 * 60 * 60 * 24));
    }

    function getDayNumber(date) {
        return diffDays(RELATIONSHIP_START, date) + 1;
    }

    // 按日期升序的存档序号（第 N 封画信）
    function getChronoNo(item) {
        const sortedByDate = [...galleryData].sort((a, b) => new Date(a.date) - new Date(b.date));
        return sortedByDate.findIndex(d => d.date === item.date) + 1;
    }

    function getNoNumber(date, index) {
        const today = new Date();
        const useRealNo = toUtcDay(today) >= toUtcDay(START_DATE);
        if (!useRealNo) {
            return index + 1;
        }

        const diff = diffDays(START_DATE, date) + 1;
        return diff > 0 ? diff : index + 1;
    }

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ============================================================
    // 方案 A：移动端底部导航栏交互
    // ============================================================
    const mobileBottomNav = document.getElementById('mobile-bottom-nav');
    const navHome = document.getElementById('nav-home');
    const navGallery = document.getElementById('nav-gallery');
    const navCalendar = document.getElementById('nav-calendar');
    const navSettings = document.getElementById('nav-settings');
    const calendarOverlay = document.getElementById('calendar-overlay');
    const settingsSheet = document.getElementById('settings-sheet');
    const settingsOverlay = document.getElementById('settings-overlay');
    const mobileThemeOptions = document.getElementById('mobile-theme-options');

    // 辅助函数：关闭所有 Bottom Sheet
    const closeAllSheets = () => {
        calendarSidebar?.classList.remove('open');
        calendarOverlay?.classList.remove('show');
        settingsSheet?.classList.remove('open');
        settingsOverlay?.classList.remove('show');
        settingsSheet?.setAttribute('aria-hidden', 'true');
        navSettings?.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        updateNavActiveState('gallery');
    };

    // 更新导航栏激活状态
    const updateNavActiveState = (activeNav) => {
        [navHome, navGallery, navCalendar, navSettings].forEach(btn => {
            btn?.classList.remove('active');
        });
        if (activeNav === 'home') navHome?.classList.add('active');
        else if (activeNav === 'gallery') navGallery?.classList.add('active');
        else if (activeNav === 'calendar') navCalendar?.classList.add('active');
        else if (activeNav === 'settings') navSettings?.classList.add('active');
    };

    // 收起日历（手机底部抽屉 / 平板浮层）：遮罩、滚动锁、底栏状态一起复位
    function closeCalendarPanel() {
        calendarSidebar?.classList.remove('open');
        calendarOverlay?.classList.remove('show');
        toggleCalendarBtn?.classList.remove('active');
        document.body.classList.add('sidebar-closed');
        document.body.style.overflow = '';
        updateNavActiveState('gallery');
    }

    // 首页按钮：返回入口页（预览日期一并带上）
    navHome?.addEventListener('click', () => {
        window.location.href = PREVIEW_DATE ? `index.html?date=${formatDateISO(PREVIEW_DATE)}` : 'index.html';
    });

    // 画廊按钮：关闭所有面板，回到画廊视图
    navGallery?.addEventListener('click', () => {
        closeAllSheets();
    });

    // 日历按钮：切换日历 Bottom Sheet
    navCalendar?.addEventListener('click', () => {
        const isOpen = calendarSidebar?.classList.contains('open');
        
        // 先关闭设置面板
        settingsSheet?.classList.remove('open');
        settingsOverlay?.classList.remove('show');
        settingsSheet?.setAttribute('aria-hidden', 'true');
        navSettings?.setAttribute('aria-expanded', 'false');
        
        if (isOpen) {
            calendarSidebar?.classList.remove('open');
            calendarOverlay?.classList.remove('show');
            document.body.style.overflow = '';
            updateNavActiveState('gallery');
        } else {
            calendarSidebar?.classList.add('open');
            calendarOverlay?.classList.add('show');
            document.body.style.overflow = 'hidden'; // 防止背景滚动
            updateNavActiveState('calendar');
        }
    });

    // 设置按钮：切换设置 Bottom Sheet
    navSettings?.addEventListener('click', () => {
        const isOpen = settingsSheet?.classList.contains('open');
        
        // 先关闭日历面板
        calendarSidebar?.classList.remove('open');
        calendarOverlay?.classList.remove('show');
        
        if (isOpen) {
            settingsSheet?.classList.remove('open');
            settingsOverlay?.classList.remove('show');
            settingsSheet?.setAttribute('aria-hidden', 'true');
            navSettings?.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
            updateNavActiveState('gallery');
        } else {
            settingsSheet?.classList.add('open');
            settingsOverlay?.classList.add('show');
            settingsSheet?.setAttribute('aria-hidden', 'false');
            navSettings?.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
            updateNavActiveState('settings');
            // 更新主题选项的激活状态
            updateMobileThemeButtons();
        }
    });

    // 点击遮罩层关闭日历
    calendarOverlay?.addEventListener('click', () => {
        calendarSidebar?.classList.remove('open');
        calendarOverlay?.classList.remove('show');
        document.body.style.overflow = '';
        updateNavActiveState('gallery');
    });

    // 点击遮罩层关闭设置
    settingsOverlay?.addEventListener('click', () => {
        settingsSheet?.classList.remove('open');
        settingsOverlay?.classList.remove('show');
        settingsSheet?.setAttribute('aria-hidden', 'true');
        navSettings?.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        updateNavActiveState('gallery');
    });

    // 移动端主题切换
    const updateMobileThemeButtons = () => {
        const currentTheme = document.documentElement.dataset.theme || 'spring';
        mobileThemeOptions?.querySelectorAll('.theme-option').forEach(btn => {
            const isActive = btn.dataset.theme === currentTheme;
            btn.classList.toggle('active', isActive);
        });
    };

    mobileThemeOptions?.querySelectorAll('.theme-option').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            applyTheme(theme);
            updateMobileThemeButtons();
            // 切换主题后自动关闭设置面板
            setTimeout(() => {
                settingsSheet?.classList.remove('open');
                settingsOverlay?.classList.remove('show');
                settingsSheet?.setAttribute('aria-hidden', 'true');
                navSettings?.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
                updateNavActiveState('gallery');
            }, 300);
        });
    });

    // 同步桌面端主题切换按钮的事件到移动端
    themeButtons.forEach(btn => {
        btn.addEventListener('click', updateMobileThemeButtons);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' || !settingsSheet?.classList.contains('open')) return;
        if (detailModal?.classList.contains('open')) return;
        settingsSheet.classList.remove('open');
        settingsOverlay?.classList.remove('show');
        settingsSheet.setAttribute('aria-hidden', 'true');
        navSettings?.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        updateNavActiveState('gallery');
        navSettings?.focus();
    });

    // ============================================================
    // 排版自检：URL 带 ?lmdev=1 时暴露钩子，可逐封渲染今日卡和看画页，
    // 批量检查断行（正常访问不受影响）
    // ============================================================
    if (new URLSearchParams(window.location.search).has('lmdev')) {
        const imageReady = (img) => (img.complete && img.naturalWidth)
            ? Promise.resolve()
            : new Promise(resolve => {
                img.addEventListener('load', resolve, { once: true });
                img.addEventListener('error', resolve, { once: true });
            });
        window.__LM = {
            dates: () => galleryData.map(d => d.date),
            async hero(dateStr) {
                const item = dataByDate[dateStr];
                if (!item) return false;
                closeDetail();
                currentMonth = new Date(item.dateObj);
                renderTodayHero({ item, isToday: true });
                await imageReady(document.getElementById('today-hero-img'));
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
