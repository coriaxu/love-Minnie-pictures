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
        if (isActive) {
            torch.style.width = '600px';
            torch.style.height = '600px';
            torch.style.background =
                'radial-gradient(circle, rgba(255, 140, 110, 0.2) 0%, rgba(255, 100, 120, 0.1) 50%, transparent 70%)';
        } else {
            torch.style.width = '400px';
            torch.style.height = '400px';
            torch.style.background =
                'radial-gradient(circle, rgba(255, 180, 195, 0.12) 0%, rgba(255, 120, 100, 0.05) 50%, transparent 70%)';
        }
    };

    // ============================================================
    // State
    // ============================================================
    const START_DATE = new Date('2026-01-01T00:00:00');
    const RELATIONSHIP_START = new Date('2009-12-10T00:00:00');
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
        const value = filename ? `url('images/${filename}')` : 'none';
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
            const todayIn2026 = new Date(2026, realToday.getMonth(), realToday.getDate());
            const todayStr = formatDateISO(todayIn2026);

            let initialDate = null;

            if (todayIn2026 >= START_DATE && dataByDate[todayStr]) {
                initialDate = todayIn2026;
            } else if (galleryData.length > 0) {
                initialDate = galleryData[0].dateObj;
            }

            if (!initialDate) {
                renderCalendar();
                renderTimeline();
                showEmptyState({ mode: getEmptyMode(START_DATE), date: START_DATE });
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
            showEmptyState({ mode: getEmptyMode(START_DATE), date: START_DATE });
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
        if (detailModal && detailModal.classList.contains('open')) {
            if (e.key === 'Escape') {
                closeDetail();
            }
            return;
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

            const cell = document.createElement('div');
            cell.className = 'day-cell';
            cell.dataset.date = dateStr;

            if (hasContent) cell.classList.add('has-content');
            if (isFuture) cell.classList.add('future');
            if (isSelected) cell.classList.add('selected');
            if (isToday) cell.classList.add('today');

            if (isFuture) {
                cell.innerHTML = '<span class="seed-icon"><img src="images/sunflower_icon.png" class="sunflower-icon" alt="🌻"></span>';
            } else {
                cell.textContent = day;
            }

            if (!isFuture) {
                cell.addEventListener('click', () => {
                    selectDate(cellDate);
                    if (window.innerWidth <= 1024) {
                        calendarSidebar.classList.remove('open');
                    }
                });
            }

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

        allItems.forEach((item) => {
            const thumb = document.createElement('div');
            thumb.className = 'timeline-thumb';
            thumb.dataset.date = item.date;

            if (item.isFuture) {
                thumb.classList.add('future');
                thumb.innerHTML = '<img src="images/sunflower_icon.png" class="sunflower-icon" alt="🌻">';
            } else {
                const img = document.createElement('img');
                img.src = `images/${item.filename}`;
                img.alt = item.title || 'Artwork';
                img.loading = 'lazy';
                thumb.appendChild(img);

                thumb.addEventListener('click', () => {
                    selectDate(new Date(item.date), { scroll: true });
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

    function updateMonthView(options = {}) {
        const { anchorDate = null } = options;
        const items = getItemsForMonth(currentMonth);

        if (!items.length) {
            clearBgBlur();
            showEmptyState({ mode: getEmptyMode(currentMonth), date: currentMonth });
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
            showEmptyState({ mode: getEmptyMode(currentMonth), date: currentMonth });
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
        meta.innerHTML = `
            <div class="gallery-meta-top">
                <span>Day ${String(dayNum).padStart(2, '0')}</span>
                <span>No. ${String(noNum).padStart(3, '0')}</span>
                <span>${formatDateDisplay(itemDate)}</span>
            </div>
            <div class="gallery-title">${escapeHtml(item.title || 'Untitled')}</div>
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
            return;
        }

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

    function updateDateCapsule(item) {
        if (!dateCapsule || !item?.date) return;
        const d = new Date(item.date);
        const dayNum = getDayNumber(d);
        const shortMonth = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
        dateCapsule.textContent = `Day ${dayNum} · ${shortMonth} ${d.getDate()}`;
    }

    function updateDateCapsuleForMonth(date) {
        if (!dateCapsule || !date) return;
        dateCapsule.textContent = formatMonthDisplay(date);
    }

    function getEmptyMode(date) {
        const monthKey = date.getFullYear() * 12 + date.getMonth();
        const startKey = START_DATE.getFullYear() * 12 + START_DATE.getMonth();
        return monthKey < startKey ? 'past' : 'future';
    }

    function showEmptyState(config = {}) {
        const { mode = 'future', date = currentMonth } = config;
        if (!emptyState) return;
        emptyState.style.display = 'flex';
        if (galleryGrid) {
            galleryGrid.innerHTML = '';
            galleryGrid.style.display = 'none';
        }

        if (mode === 'future') {
            if (emptyTitle) emptyTitle.textContent = '花期未至';
            if (emptyDateText) {
                emptyDateText.textContent = `${formatMonthDisplayZh(date)} · 敬请期待`;
            }
            if (emptySubtext) {
                emptySubtext.textContent = `${formatMonthDisplay(date)} · The gallery is still asleep.`;
            }
        } else if (mode === 'past') {
            if (emptyTitle) emptyTitle.textContent = '旧梦微光';
            if (emptyDateText) {
                emptyDateText.textContent = `${formatMonthDisplayZh(date)} · 美好已成回忆`;
            }
            if (emptySubtext) {
                emptySubtext.textContent = `${formatMonthDisplay(date)} · Those days now glow in memory.`;
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
        const dateStr = formatDateISO(newDate);

        if (!dataByDate[dateStr]) return;
        selectDate(newDate);
    }

    // ============================================================
    // Detail Modal
    // ============================================================
    function openDetail(item) {
        if (!item || !detailModal) return;

        detailImage.src = `images/${item.filename}`;
        detailImage.alt = item.title || 'Artwork detail';
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
});
