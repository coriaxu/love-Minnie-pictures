/**
 * Year in Review - Cinematic Poster Generator
 * 年度回顾 - 电影级蒙太奇海报生成器
 * 
 * Features:
 * - 🎁 Gift button appears only on Dec 31 (or dev mode)
 * - Bento Grid layout for 12 monthly photos
 * - Click-to-replace photo mechanism
 * - High-quality poster download via html2canvas
 */

(function () {
    'use strict';

    // ============================================================
    // CONFIGURATION
    // ============================================================
    const CONFIG = {
        // Set to true to always show the gift button (for development)
        DEV_MODE: true,

        // Target date when the gift button appears (Dec 31)
        TARGET_MONTH: 11, // 0-indexed (11 = December)
        TARGET_DAY: 31,

        // Poster target year
        TARGET_YEAR: 2026,

        // Month names for labels
        MONTH_NAMES: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    };

    // ============================================================
    // INITIALIZATION
    // ============================================================
    document.addEventListener('DOMContentLoaded', init);

    function init() {
        createGiftButton();
        createModal();
        checkVisibility();
    }

    // ============================================================
    // CREATE GIFT BUTTON
    // ============================================================
    function createGiftButton() {
        const btn = document.createElement('button');
        btn.className = 'year-review-trigger';
        btn.id = 'year-review-btn';
        btn.innerHTML = '🎁';
        btn.setAttribute('aria-label', 'Open Year in Review');
        btn.addEventListener('click', openModal);
        document.body.appendChild(btn);

        // Add dev mode indicator if enabled
        if (CONFIG.DEV_MODE) {
            btn.classList.add('dev-mode');
        }
    }

    // ============================================================
    // CHECK VISIBILITY (Dec 31 or Dev Mode)
    // ============================================================
    function checkVisibility() {
        const btn = document.getElementById('year-review-btn');
        if (!btn) return;

        const today = new Date();
        const isTargetDate = (today.getMonth() === CONFIG.TARGET_MONTH &&
            today.getDate() === CONFIG.TARGET_DAY);

        if (CONFIG.DEV_MODE || isTargetDate) {
            // Small delay for animation effect
            setTimeout(() => {
                btn.classList.add('visible');
            }, 1000);
        }
    }

    // ============================================================
    // CREATE MODAL STRUCTURE
    // ============================================================
    function createModal() {
        const modal = document.createElement('div');
        modal.className = 'year-review-modal';
        modal.id = 'year-review-modal';

        modal.innerHTML = `
            <div class="poster-wrapper" id="poster-canvas">
                <button class="poster-close" id="poster-close" aria-label="Close">✕</button>
                
                <div class="poster-content" id="poster-grid">
                    ${generateGridCells()}
                </div>
                
                <div class="poster-title-bar">
                    <div class="poster-title">
                        <h2>MINNIE · ${CONFIG.TARGET_YEAR}</h2>
                        <span>Year in Review · 年度回顾</span>
                    </div>
                    <div class="poster-actions">
                        <button class="poster-btn" id="poster-shuffle">🔄 随机选图</button>
                        <button class="poster-btn primary" id="poster-download">📥 下载海报</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event Listeners
        document.getElementById('poster-close').addEventListener('click', closeModal);
        document.getElementById('poster-shuffle').addEventListener('click', shufflePhotos);
        document.getElementById('poster-download').addEventListener('click', downloadPoster);

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('open')) {
                closeModal();
            }
        });

        // Cell click handlers (for future photo selection)
        document.querySelectorAll('.poster-cell').forEach((cell, index) => {
            cell.addEventListener('click', () => handleCellClick(index));
        });
    }

    // ============================================================
    // GENERATE GRID CELLS (12 months)
    // ============================================================
    function generateGridCells() {
        let html = '';
        for (let i = 0; i < 12; i++) {
            html += `
                <div class="poster-cell placeholder" data-month="${i}">
                    <span class="month-label">${CONFIG.MONTH_NAMES[i]}</span>
                </div>
            `;
        }
        return html;
    }

    // ============================================================
    // POPULATE PHOTOS FROM GALLERY DATA
    // ============================================================
    function populatePhotos() {
        const cells = document.querySelectorAll('.poster-cell');
        const galleryData = window.__GALLERY_DATA__ || [];

        if (!galleryData.length) {
            console.log('Year Review: No gallery data available yet. Using placeholders.');
            return;
        }

        // Group photos by month
        const photosByMonth = {};
        galleryData.forEach(item => {
            const date = new Date(item.date);
            const year = date.getFullYear();
            // Only include photos from the target year
            if (year === CONFIG.TARGET_YEAR) {
                const month = date.getMonth();
                if (!photosByMonth[month]) {
                    photosByMonth[month] = [];
                }
                photosByMonth[month].push(item);
            }
        });

        // Fill each cell with a photo from that month (if available)
        cells.forEach((cell, index) => {
            const monthPhotos = photosByMonth[index];
            if (monthPhotos && monthPhotos.length > 0) {
                // Pick a random photo from that month
                const photo = monthPhotos[Math.floor(Math.random() * monthPhotos.length)];
                setCellPhoto(cell, photo);
            }
        });
    }

    // ============================================================
    // SET PHOTO IN CELL
    // ============================================================
    function setCellPhoto(cell, photoData) {
        cell.classList.remove('placeholder');
        // 单层图片：统一 16:9 格子，直接用 cover 填满
        cell.innerHTML = `<img src="images/${photoData.filename}" alt="${photoData.title || 'Photo'}" loading="lazy">`;
        cell.dataset.filename = photoData.filename;
    }

    // ============================================================
    // SHUFFLE PHOTOS (Randomly reassign)
    // ============================================================
    function shufflePhotos() {
        const btn = document.getElementById('poster-shuffle');
        btn.disabled = true;
        btn.innerHTML = '⏳ 加载中...';

        // Re-populate with random selection
        setTimeout(() => {
            // Reset all cells to placeholder
            document.querySelectorAll('.poster-cell').forEach((cell, index) => {
                cell.classList.add('placeholder');
                cell.innerHTML = `<span class="month-label">${CONFIG.MONTH_NAMES[index]}</span>`;
                delete cell.dataset.filename;
            });

            // Re-populate
            populatePhotos();

            btn.disabled = false;
            btn.innerHTML = '🔄 随机选图';
        }, 300);
    }

    // ============================================================
    // HANDLE CELL CLICK (Future: Photo Picker)
    // ============================================================
    function handleCellClick(index) {
        const cell = document.querySelectorAll('.poster-cell')[index];
        const monthName = CONFIG.MONTH_NAMES[index];

        // TODO: Open a photo picker modal to let user select a different photo
        // For now, just show a tooltip
        console.log(`Clicked cell for ${monthName}. Photo selection coming soon!`);

        // Visual feedback
        cell.style.outline = '2px solid rgba(255, 140, 200, 0.8)';
        setTimeout(() => {
            cell.style.outline = 'none';
        }, 300);
    }

    // ============================================================
    // DOWNLOAD POSTER (HTML2Canvas)
    // ============================================================
    async function downloadPoster() {
        const btn = document.getElementById('poster-download');
        btn.disabled = true;
        btn.innerHTML = '⏳ 生成中...';

        try {
            // Dynamically load html2canvas if not already loaded
            if (typeof html2canvas === 'undefined') {
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
            }

            const canvas = document.getElementById('poster-canvas');

            // Generate canvas
            const result = await html2canvas(canvas, {
                scale: 2, // 2x resolution for crisp output
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#0a0514',
                logging: false
            });

            // Convert to downloadable PNG
            const link = document.createElement('a');
            link.download = `Minnie_Year_In_Review_${CONFIG.TARGET_YEAR}.png`;
            link.href = result.toDataURL('image/png');
            link.click();

            btn.innerHTML = '✅ 已下载!';
            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = '📥 下载海报';
            }, 2000);

        } catch (error) {
            console.error('Error generating poster:', error);
            btn.innerHTML = '❌ 生成失败';
            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = '📥 下载海报';
            }, 2000);
        }
    }

    // ============================================================
    // LOAD EXTERNAL SCRIPT
    // ============================================================
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // ============================================================
    // MODAL CONTROLS
    // ============================================================
    function openModal() {
        const modal = document.getElementById('year-review-modal');
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';

        // Populate photos when modal opens
        populatePhotos();
    }

    function closeModal() {
        const modal = document.getElementById('year-review-modal');
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }

})();
