/**
 * Minnie's 2026 - Calendar Journal Hybrid
 * Monet-inspired warm design with split layout
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

    const dayCard = document.getElementById('day-card');
    const emptyState = document.getElementById('empty-state');
    const cardImage = document.getElementById('card-image');
    const cardBgBlur = document.getElementById('card-bg-blur');
    const cardTitle = document.getElementById('card-title');
    const cardDate = document.getElementById('card-date');
    const cardNumber = document.getElementById('card-number');
    const cardDescription = document.getElementById('card-description');
    const emptyDateText = document.getElementById('empty-date-text');

    // Flip Card Elements
    const flipCard = document.getElementById('flip-card');
    const letterDate = document.getElementById('letter-date');
    const letterContent = document.getElementById('letter-content');

    // Welcome Page Elements
    const welcomeOverlay = document.getElementById('welcome-overlay');
    const enterBtn = document.getElementById('enter-btn');

    const timelineContainer = document.getElementById('timeline-container');
    const timelinePrev = document.getElementById('timeline-prev');
    const timelineNext = document.getElementById('timeline-next');

    // ============================================================
    // Welcome Page Logic
    // ============================================================
    // Check if user has already entered (skip welcome page)
    const hasEntered = localStorage.getItem('minnieGardenEntered');
    if (hasEntered && welcomeOverlay) {
        welcomeOverlay.classList.add('hidden');
    }

    // Enter button click handler
    if (enterBtn && welcomeOverlay) {
        enterBtn.addEventListener('click', () => {
            welcomeOverlay.classList.add('hidden');
            localStorage.setItem('minnieGardenEntered', 'true');
        });
    }

    // ============================================================
    // State
    // ============================================================
    const START_DATE = new Date('2026-01-01T00:00:00');
    let currentMonth = new Date(START_DATE);
    let selectedDate = new Date(START_DATE);
    let galleryData = [];
    let dataByDate = {}; // Quick lookup: { "2026-01-01": {...} }

    // ============================================================
    // Initialize
    // ============================================================
    fetch('data.json')
        .then(res => res.json())
        .then(data => {
            // Map the provided data to 2026 dates (since actual data is from 2025)
            galleryData = data.map((item, index) => {
                const newDate = new Date(START_DATE);
                newDate.setDate(START_DATE.getDate() + index);
                const dateStr = formatDateISO(newDate);
                return {
                    ...item,
                    date: dateStr,
                    dateObj: newDate
                };
            });

            // Build lookup map
            galleryData.forEach(item => {
                dataByDate[item.date] = item;
            });

            renderCalendar();
            renderTimeline();

            // Jump to today's date (mapped to 2026 timeline)
            // Since user data is from 2025, we map real-world dates to 2026
            // For demo: Calculate how many days since 2026-01-01 the current date would be
            const realToday = new Date();
            realToday.setHours(0, 0, 0, 0);

            // Map today to 2026 equivalent: same month and day
            const todayIn2026 = new Date(2026, realToday.getMonth(), realToday.getDate());

            // If today in 2026 is before start date or has no content, fallback to most recent with content
            const todayStr = formatDateISO(todayIn2026);
            if (todayIn2026 >= START_DATE && (dataByDate[todayStr] || todayIn2026 <= new Date())) {
                selectDate(todayIn2026);
            } else {
                // Fallback to most recent entry with content
                if (galleryData.length > 0) {
                    selectDate(galleryData[galleryData.length - 1].dateObj);
                } else {
                    selectDate(START_DATE);
                }
            }
        })
        .catch(err => console.error('Error loading data:', err));

    // ============================================================
    // Event Listeners
    // ============================================================
    prevMonthBtn.addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        renderCalendar();
    });

    toggleCalendarBtn.addEventListener('click', () => {
        calendarSidebar.classList.toggle('open');
        toggleCalendarBtn.classList.toggle('active');
    });

    timelinePrev.addEventListener('click', () => {
        timelineContainer.scrollBy({ left: -200, behavior: 'smooth' });
    });

    timelineNext.addEventListener('click', () => {
        timelineContainer.scrollBy({ left: 200, behavior: 'smooth' });
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            navigateDay(-1);
        } else if (e.key === 'ArrowRight') {
            navigateDay(1);
        } else if (e.key === 'Escape') {
            // Reset flip on Escape
            if (flipCard) flipCard.classList.remove('flipped');
        }
    });

    // Flip Card Click Event
    if (flipCard) {
        flipCard.addEventListener('click', (e) => {
            // Don't flip if clicking on timeline navigation elements
            if (e.target.closest('.timeline-strip') || e.target.closest('.app-header')) {
                return;
            }
            flipCard.classList.toggle('flipped');
        });
    }

    // ============================================================
    // Calendar Rendering
    // ============================================================
    function renderCalendar() {
        calendarDays.innerHTML = '';

        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        // Update label
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        monthLabel.textContent = `${monthNames[month]} ${year}`;

        // First day of month (0 = Sunday)
        const firstDay = new Date(year, month, 1).getDay();
        // Total days in month
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Empty cells before first day
        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'day-cell empty';
            calendarDays.appendChild(emptyCell);
        }

        // Day cells
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
                cell.innerHTML = `<span class="seed-icon"><img src="images/sunflower_icon.png" class="sunflower-icon" alt="🌻"></span>`;
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

        // Show all gallery items + a few future placeholders
        const allItems = [...galleryData];

        // Add some future placeholders
        const lastDate = galleryData.length > 0
            ? new Date(galleryData[galleryData.length - 1].dateObj)
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
                thumb.innerHTML = '<img src="images/sunflower_icon.png" class="sunflower-icon" alt="🌻">';
            } else {
                const img = document.createElement('img');
                img.src = `images/${item.filename}`;
                img.alt = item.title || 'Artwork';
                img.loading = 'lazy';
                thumb.appendChild(img);

                thumb.addEventListener('click', () => {
                    selectDate(new Date(item.date));
                });
            }

            if (formatDateISO(selectedDate) === item.date) {
                thumb.classList.add('selected');
            }

            timelineContainer.appendChild(thumb);
        });
    }

    // ============================================================
    // Select & Display Day
    // ============================================================
    function selectDate(date) {
        selectedDate = new Date(date);
        const dateStr = formatDateISO(selectedDate);
        const item = dataByDate[dateStr];

        // Update calendar highlights
        document.querySelectorAll('.day-cell.selected').forEach(el => el.classList.remove('selected'));
        const targetCell = document.querySelector(`.day-cell[data-date="${dateStr}"]`);
        if (targetCell) targetCell.classList.add('selected');

        // Update timeline highlights
        document.querySelectorAll('.timeline-thumb.selected').forEach(el => el.classList.remove('selected'));
        const targetThumb = document.querySelector(`.timeline-thumb[data-date="${dateStr}"]`);
        if (targetThumb) {
            targetThumb.classList.add('selected');
            // Scroll into view
            targetThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }

        // Update content card
        if (item) {
            showDayCard(item);
        } else {
            showEmptyState(dateStr);
        }

        // If month changed, re-render calendar
        if (currentMonth.getMonth() !== selectedDate.getMonth() ||
            currentMonth.getFullYear() !== selectedDate.getFullYear()) {
            currentMonth = new Date(selectedDate);
            renderCalendar();
        }
    }

    function showDayCard(item) {
        emptyState.style.display = 'none';
        dayCard.style.display = 'block';

        // Reset flip state when changing photos
        if (flipCard) {
            flipCard.classList.remove('flipped');
        }

        const imgSrc = `images/${item.filename}`;
        if (cardImage) cardImage.src = imgSrc;
        if (cardBgBlur) cardBgBlur.style.backgroundImage = `url('${imgSrc}')`;

        // Update these only if they exist (they might have been removed from front)
        if (cardTitle) cardTitle.textContent = item.title || 'Untitled';
        if (cardDate) cardDate.textContent = formatDateDisplay(new Date(item.date));
        if (cardNumber) cardNumber.textContent = `No. ${String(galleryData.indexOf(item) + 1).padStart(3, '0')}`;
        if (cardDescription) cardDescription.textContent = item.description || 'A beautiful moment captured in time.';

        // Populate Love Letter (Back Side)
        if (letterDate) {
            letterDate.textContent = formatDateDisplay(new Date(item.date));
        }
        if (letterContent) {
            const loveLetterText = item.loveLetter || '这是一个特别的日子，值得被永远铭记。💕';
            // Convert \n to <br> for line breaks
            letterContent.innerHTML = `<p>${loveLetterText.replace(/\n/g, '<br>')}</p>`;
        }

        // Animate in
        const imgObj = new Image();
        imgObj.src = imgSrc;
        imgObj.onload = () => {
            if (imgObj.naturalHeight > imgObj.naturalWidth) {
                dayCard.classList.add('is-portrait');
            } else {
                dayCard.classList.remove('is-portrait');
            }
        };

        dayCard.style.animation = 'none';
        dayCard.offsetHeight; // Trigger reflow
        dayCard.style.animation = 'fadeInUp 0.5s ease-out';
    }

    function showEmptyState(dateStr) {
        dayCard.style.display = 'none';
        emptyState.style.display = 'flex';
        emptyDateText.textContent = `${formatDateDisplay(new Date(dateStr))} — This memory is waiting to unfold...`;
    }

    // ============================================================
    // Navigation
    // ============================================================
    function navigateDay(offset) {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + offset);

        // Don't go before start date
        if (newDate < START_DATE) return;

        selectDate(newDate);
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
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }
});
