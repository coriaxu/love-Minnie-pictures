/**
 * Moments Page Logic
 * Renders the timeline feed and handles interactions
 */

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initSettingsSheet();
    initMomentsFeed();
    initScrollAnimation();
});

const THEME_STORAGE_KEY = 'love-minnie-theme-v3';
const THEME_SET = new Set(['winter', 'spring', 'summer', 'autumn']);

function getSeasonalTheme() {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
}

function applyTheme(theme, options = {}) {
    const { persist = true } = options;
    const nextTheme = THEME_SET.has(theme) ? theme : getSeasonalTheme();
    document.documentElement.dataset.theme = nextTheme;

    document.querySelectorAll('.theme-btn').forEach(btn => {
        const isActive = btn.dataset.theme === nextTheme;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === nextTheme);
    });

    if (persist) {
        try {
            localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        } catch (err) {
            console.warn('Theme persistence failed:', err);
        }
    }
}

function initTheme() {
    let storedTheme = null;
    try {
        storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    } catch (err) {
        storedTheme = null;
    }

    const hasStoredTheme = THEME_SET.has(storedTheme);
    const initialTheme = hasStoredTheme ? storedTheme : getSeasonalTheme();
    applyTheme(initialTheme, { persist: hasStoredTheme });

    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
    });
}

function initSettingsSheet() {
    const navSettings = document.getElementById('nav-settings');
    const settingsSheet = document.getElementById('settings-sheet');
    const settingsOverlay = document.getElementById('settings-overlay');
    const momentsNav = document.querySelector('.mobile-bottom-nav .nav-item.active');

    if (!navSettings || !settingsSheet) return;

    const setOpen = (open) => {
        settingsSheet.classList.toggle('open', open);
        settingsOverlay?.classList.toggle('show', open);
        settingsSheet.setAttribute('aria-hidden', open ? 'false' : 'true');
        navSettings.setAttribute('aria-expanded', open ? 'true' : 'false');
        navSettings.classList.toggle('active', open);
        momentsNav?.classList.toggle('active', !open);
        document.body.style.overflow = open ? 'hidden' : '';
    };

    navSettings.addEventListener('click', () => {
        setOpen(!settingsSheet.classList.contains('open'));
    });

    settingsOverlay?.addEventListener('click', () => setOpen(false));

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && settingsSheet.classList.contains('open')) {
            setOpen(false);
            navSettings.focus();
        }
    });

    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.addEventListener('click', () => {
            applyTheme(btn.dataset.theme);
            setTimeout(() => setOpen(false), 300);
        });
    });
}

function initMomentsFeed() {
    const container = document.getElementById('moments-feed');
    const data = window.MOMENTS_DATA || [];

    if (data.length === 0) {
        container.innerHTML += `
            <div class="empty-feed" role="status">
                <p class="empty-feed-title">点滴栏目尚未启用</p>
                <p class="empty-feed-copy">这里会记下画廊之外的生活碎片。内容还在准备，不是加载失败。</p>
            </div>`;
        return;
    }

    // Sort by date descending (Newest first)
    // Or Ascending? User layout might prefer chronological.
    // Let's do Ascending (Jan -> Dec) for a "Journey" feel.
    data.sort((a, b) => new Date(a.date) - new Date(b.date));

    data.forEach(moment => {
        const card = createMomentCard(moment);
        container.appendChild(card);
    });
}

function createMomentCard(moment) {
    const dateObj = new Date(moment.date);
    const month = dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const day = dateObj.getDate();

    const article = document.createElement('article');
    article.className = 'moment-card';

    // Determine Grid Class based on photo count
    let gridClass = 'grid-1';
    if (moment.photos.length === 2) gridClass = 'grid-2';
    if (moment.photos.length === 3) gridClass = 'grid-3';
    if (moment.photos.length >= 4) gridClass = 'grid-4'; // Simply 2x2 for 4+ for now

    // Generate Photos HTML
    let photosHtml = '';
    // Limit to 4 for grid preview, handle others later or just show all in simple grid
    // For specific "18 photos" requirement, we might need a "See +14 more" overlay.
    // For now, let's render up to 4, and if more, add overlay on the last one.

    const displayCount = Math.min(moment.photos.length, 4);

    for (let i = 0; i < displayCount; i++) {
        const src = `images/${moment.photos[i]}`;
        photosHtml += `<img src="${src}" alt="${moment.title}" loading="lazy" onclick="openLightbox('${src}')">`;
    }

    article.innerHTML = `
        <div class="moment-date">
            <span class="month">${month}</span>
            <span class="day">${day}</span>
        </div>
        <div class="moment-content">
            <h2 class="moment-title">${moment.title}</h2>
            ${moment.description ? `<p class="moment-desc">${moment.description}</p>` : ''}

            <div class="moment-gallery ${gridClass}">
                ${photosHtml}
            </div>

            ${moment.location ? `
            <div class="moment-meta">
                <i class="fa-solid fa-location-dot"></i> ${moment.location}
            </div>` : ''}
        </div>
    `;

    return article;
}

// Scroll Reveal Animation (Intersection Observer)
function initScrollAnimation() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    });

    document.querySelectorAll('.moment-card').forEach(card => {
        observer.observe(card);
    });
}

// Simple Lightbox Logic
window.openLightbox = function(src) {
    const lightbox = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    img.src = src;
    lightbox.setAttribute('aria-hidden', 'false');
}

document.querySelector('.lightbox-close')?.addEventListener('click', () => {
    document.getElementById('lightbox').setAttribute('aria-hidden', 'true');
});

document.getElementById('lightbox')?.addEventListener('click', (e) => {
    if (e.target.id === 'lightbox') {
        document.getElementById('lightbox').setAttribute('aria-hidden', 'true');
    }
});
