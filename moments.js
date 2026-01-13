/**
 * Moments Page Logic
 * Renders the timeline feed and handles interactions
 */

document.addEventListener('DOMContentLoaded', () => {
    initMomentsFeed();
    initScrollAnimation();
});

function initMomentsFeed() {
    const container = document.getElementById('moments-feed');
    const data = window.MOMENTS_DATA || [];

    if (data.length === 0) {
        container.innerHTML += `<div class="empty-feed">暂无点滴记录，敬请期待...</div>`;
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

document.querySelector('.lightbox-close').addEventListener('click', () => {
    document.getElementById('lightbox').setAttribute('aria-hidden', 'true');
});

document.getElementById('lightbox').addEventListener('click', (e) => {
    if (e.target.id === 'lightbox') {
        document.getElementById('lightbox').setAttribute('aria-hidden', 'true');
    }
});
