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
    // ROSE TORCH CURSOR LOGIC
    // ============================================================
    const torch = document.getElementById('torch');
    const dot = document.getElementById('dot');

    if (torch && dot) {
        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;

        const animateCursor = () => {
            torch.style.left = `${mouseX}px`;
            torch.style.top = `${mouseY}px`;
            dot.style.left = `${mouseX}px`;
            dot.style.top = `${mouseY}px`;
            requestAnimationFrame(animateCursor);
        };
        animateCursor();

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
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
        const month = new Date().getMonth(); // 0-11
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

            const realToday = new Date();
            realToday.setHours(0, 0, 0, 0);
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
        calendarSidebar.classList.toggle('open');
        toggleCalendarBtn.classList.toggle('active');
        document.body.classList.toggle('sidebar-closed', !calendarSidebar.classList.contains('open'));

        // 在动画过程中持续刷新布局，消除"先错后对"的顿挫感
        // 使用 requestAnimationFrame 循环，持续 500ms
        const startTime = performance.now();
        const animationDuration = 500;

        const smoothResize = () => {
            resizeAllGalleryItems();
            if (performance.now() - startTime < animationDuration) {
                requestAnimationFrame(smoothResize);
            }
        };
        requestAnimationFrame(smoothResize);
    });

    timelinePrev.addEventListener('click', () => {
        timelineContainer.scrollBy({ left: -200, behavior: 'smooth' });
    });

    timelineNext.addEventListener('click', () => {
        timelineContainer.scrollBy({ left: 200, behavior: 'smooth' });
    });

    window.addEventListener('resize', () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(resizeAllGalleryItems, 150);
    });

    document.addEventListener('keydown', (e) => {
        const isModalOpen = detailModal && detailModal.classList.contains('open');
        if (isModalOpen) {
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

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        monthLabel.textContent = `${monthNames[month]} ${year}`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

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

            if (isFuture) {
                cell.innerHTML = '<span class="seed-icon"><img src="images/sunflower.svg" class="sunflower-icon" alt="🌻"></span>';
            } else {
                cell.textContent = day;
            }

            cell.addEventListener('click', () => {
                selectDate(cellDate);
                if (window.innerWidth <= 1024) {
                    calendarSidebar.classList.remove('open');
                }
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

        allItems.forEach((item, index) => {
            const thumb = document.createElement('div');
            thumb.className = 'timeline-thumb';
            thumb.dataset.date = item.date;

            if (item.isFuture) {
                thumb.classList.add('future');
                thumb.innerHTML = '<img src="images/sunflower.svg" class="sunflower-icon" alt="🌻">';
            } else {
                const img = document.createElement('img');
                img.src = `images/${item.filename}`;
                img.alt = item.title || 'Artwork';
                img.loading = 'lazy';
                thumb.appendChild(img);

                // Add Number Badge (1-based index, Chronological)
                const badge = document.createElement('span');
                badge.className = 'thumb-badge';
                // Using the loop index directly because 'allItems' is sorted chronologically
                // and artwork items appear first.
                // This ensures No.1 is the oldest (leftmost), No.N is the newest.
                badge.textContent = index + 1;
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

        if (!items.length) {
            clearBgBlur();
            showEmptyState({ mode: getEmptyMode(currentMonth), date: currentMonth, scope: 'month' });
            updateDateCapsuleForMonth(currentMonth);
            return;
        }

        renderGallery(items);

        const anchorDateStr = anchorDate ? formatDateISO(new Date(anchorDate)) : null;
        const hasAnchor = anchorDateStr && items.some(item => item.date === anchorDateStr);
        const targetDate = hasAnchor ? new Date(anchorDate) : items[0].dateObj;
        selectDate(targetDate, { scroll: false, skipMonthUpdate: true });
    }

    // ============================================================
    // Gallery Rendering
    // ============================================================
    function renderGallery(items = galleryData) {
        if (!galleryGrid) return;
        galleryGrid.innerHTML = '';
        cardByDate.clear();

        if (!items.length) {
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
        card.setAttribute('aria-label', item.title || 'Artwork');

        const media = document.createElement('div');
        media.className = 'gallery-media';

        const img = document.createElement('img');
        img.src = `images/${item.filename}`;
        img.alt = item.title || 'Artwork';
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
        const dayNum = getDayNumber(itemDate);
        // 动态计算 No.：按日期升序排列后的位置
        const sortedByDate = [...galleryData].sort((a, b) => new Date(a.date) - new Date(b.date));
        const chronologicalIndex = sortedByDate.findIndex(d => d.date === item.date);
        const noNum = chronologicalIndex + 1;
        const titleText = item.title || formatCardDateDisplay(itemDate);
        meta.innerHTML = `
            <div class="gallery-meta-line">
                <span class="meta-prefix">Day ${String(dayNum).padStart(2, '0')} · No. ${String(noNum).padStart(3, '0')}</span>
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
            // 没有内容的日期，显示空状态
            const emptyScope = getEmptyScope(selectedDate);
            showEmptyState({ mode: getEmptyMode(selectedDate), date: selectedDate, scope: emptyScope });

            // 仍然更新选中状态
            document.querySelectorAll('.day-cell.selected').forEach(el => el.classList.remove('selected'));
            const targetCell = document.querySelector(`.day-cell[data-date="${dateStr}"]`);
            if (targetCell) targetCell.classList.add('selected');

            updateDateCapsuleForDate(selectedDate);
            flashDateCapsule();

            // 清空背景
            clearBgBlur();
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
                emptyDateText.textContent = `${zhDateText} · ${phrase.zh}`;
            }
            if (emptySubtext) {
                emptySubtext.textContent = `${enDateText} · ${phrase.en}`;
            }
        } else if (mode === 'past') {
            if (emptyTitle) emptyTitle.textContent = '旧梦微光';
            if (emptyDateText) {
                emptyDateText.textContent = `${zhDateText} · 美好已成回忆`;
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
    function openDetail(item) {
        if (!item || !detailModal) return;

        const detailDialog = detailModal.querySelector('.detail-dialog');
        const updateDetailOrientation = () => {
            if (!detailDialog) return;
            const isPortrait = detailImage.naturalHeight > detailImage.naturalWidth;
            detailDialog.classList.toggle('is-portrait', isPortrait);
            detailDialog.classList.toggle('is-landscape', !isPortrait);
        };
        
        // 先移除之前的方向类
        if (detailDialog) {
            detailDialog.classList.remove('is-portrait', 'is-landscape');
        }

        // 先绑定 onload，再切换 src，避免缓存图片时错过方向识别
        detailImage.onload = updateDetailOrientation;
        detailImage.src = `images/${item.filename}`;
        detailImage.alt = item.title || 'Artwork detail';
        if (detailImage.complete) {
            updateDetailOrientation();
        }
        // 只显示一个日期，用 YYYY.Jan.D 格式
        detailTitle.textContent = formatDateDisplay(new Date(item.date));
        // 隐藏重复的小日期
        detailDate.style.display = 'none';

        const description = item.description ? item.description.trim() : '';
        if (description) {
            detailDescription.textContent = description;
            detailDescription.style.display = 'block';
        } else {
            detailDescription.textContent = '';
            detailDescription.style.display = 'none';
        }

        const letterText = item.loveLetter || item.description || '这是一个特别的日子，值得被永远铭记。';
        detailLetter.innerHTML = escapeHtml(letterText).replace(/\n/g, '<br>');

        // 动态字号：文字少时放大
        detailLetter.classList.remove('text-xl', 'text-2xl');
        const textLength = letterText.length;
        if (textLength < 30) {
            detailLetter.classList.add('text-2xl');
        } else if (textLength < 80) {
            detailLetter.classList.add('text-xl');
        }
        detailModal.classList.add('open');
        detailModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        if (detailClose) {
            detailClose.focus();
        }

        // Add Edit Button if not exists
        let editBtn = document.getElementById('detail-edit');
        if (!editBtn) {
            editBtn = document.createElement('button');
            editBtn.id = 'detail-edit';
            editBtn.className = 'detail-action-btn';
            editBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
            editBtn.setAttribute('title', 'Review & Edit');

            // Insert before Close button
            const header = document.querySelector('.detail-header');
            if (header) {
                header.appendChild(editBtn);
            }
        }

        // Update Edit Link
        editBtn.onclick = () => {
            window.location.href = `admin.html?date=${item.date}`;
        };
    }

    function closeDetail() {
        if (!detailModal) return;
        detailModal.classList.remove('open');
        detailModal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
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

        // 首次打开时显示滑动提示（3秒后消失）
        const originalOpenDetail = openDetail;
        let hasShownHint = false;
        
        // 注：这里不覆盖原函数，滑动提示通过CSS :first-time伪类或JS逻辑单独处理
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

    // 首页按钮：返回入口页
    navHome?.addEventListener('click', () => {
        window.location.href = 'index.html';
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
            document.body.style.overflow = '';
            updateNavActiveState('gallery');
        } else {
            settingsSheet?.classList.add('open');
            settingsOverlay?.classList.add('show');
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
                document.body.style.overflow = '';
                updateNavActiveState('gallery');
            }, 300);
        });
    });

    // 同步桌面端主题切换按钮的事件到移动端
    themeButtons.forEach(btn => {
        btn.addEventListener('click', updateMobileThemeButtons);
    });

    // 移动端：重写日历切换按钮行为（Header 右侧的日历图标）
    if (window.innerWidth <= 600) {
        toggleCalendarBtn?.removeEventListener('click', () => {});
        toggleCalendarBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            navCalendar?.click(); // 委托给底部导航栏的日历按钮
        });
    }
});
