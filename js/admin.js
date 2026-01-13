const MAX_WIDTH = 1600;
const WEBP_QUALITY = 0.85;
const RELATIONSHIP_START = new Date('2009-12-10T00:00:00');
const PROJECT_START = new Date('2026-01-01T00:00:00');

// State
let currentMode = 'gallery'; // 'gallery' | 'moments'
let existingData = [];
try {
    existingData = Array.isArray(window.__GALLERY_DATA__) ? [...window.__GALLERY_DATA__] : [];
} catch (e) {
    console.warn("Gallery data not loaded");
}

let existingImageBlob = null;

// DOM Elements
const form = document.getElementById('publish-form');
const modeBtns = document.querySelectorAll('.mode-btn');
const dateInput = document.getElementById('entry-date');
const titleField = document.getElementById('title-field');
const titleInput = document.getElementById('entry-title');
const imageInput = document.getElementById('entry-image');
const letterInput = document.getElementById('entry-letter');
const descLabel = document.getElementById('desc-label');
const fileNote = document.getElementById('file-note');
const generateBtn = document.getElementById('generate-btn');
const statusText = document.getElementById('status-text');

// Preview Elements
const previewContainer = document.querySelector('.preview-image');
const previewTitle = document.getElementById('preview-title');
const previewSub = document.getElementById('preview-sub');
const mockCard = document.getElementById('mock-card'); // Hide in moments mode?

// --- Helpers ---
const setStatus = (msg) => {
    if (statusText) statusText.textContent = msg;
};

const formatDateISO = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const getFileNameFromDate = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}.webp`;
};

const loadImage = (file) => new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
    };
    img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('图片加载失败'));
    };
    img.src = url;
});

const compressToWebp = async (file) => {
    const img = await loadImage(file);
    const scale = Math.min(1, MAX_WIDTH / img.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY)
    );
    if (!blob) throw new Error('Compression failed');
    return blob;
};

const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// --- Mode Switching ---
const switchMode = (mode) => {
    currentMode = mode;
    
    // Update UI Toggles
    modeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    if (mode === 'moments') {
        titleField.style.display = 'block';
        imageInput.setAttribute('multiple', 'multiple');
        descLabel.textContent = '点滴描述';
        fileNote.textContent = '支持多选 (最多9张)，自动压缩。';
        mockCard.style.display = 'none'; // Hide gallery card preview
        
        // Reset preview text for moments
        previewTitle.textContent = titleInput.value || '未命名点滴';
        previewSub.textContent = '等待上传...';
    } else {
        titleField.style.display = 'none';
        imageInput.removeAttribute('multiple');
        descLabel.textContent = '悄悄话';
        fileNote.textContent = '推荐 16:9 或 9:16，自动压缩为 WebP。';
        mockCard.style.display = 'block';
        
        updateGalleryPreview(); // Restore gallery preview
    }
};

// --- Logic: Gallery Mode ---
const updateGalleryPreview = () => {
    if (currentMode !== 'gallery') return;
    
    const dateValue = dateInput.value ? new Date(dateInput.value) : null;
    if (!dateValue || isNaN(dateValue)) {
        previewTitle.textContent = '日期未选择';
        return;
    }

    // Reuse existing logic for finding Day No.
    // ... simplified for brevity, assuming similar to original logic
    const dayDisplay = dateValue.toDateString(); 
    previewTitle.textContent = dayDisplay;
    
    // Image Preview
    if (imageInput.files && imageInput.files[0]) {
        const url = URL.createObjectURL(imageInput.files[0]);
        previewContainer.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:contain;">`;
    }
};

// --- Logic: Moments Mode ---
const updateMomentsPreview = () => {
    if (currentMode !== 'moments') return;

    previewTitle.textContent = titleInput.value || '未命名点滴';
    
    const count = imageInput.files ? imageInput.files.length : 0;
    previewSub.textContent = `已选 ${count} 张照片`;

    if (count > 0) {
        // Show first image as preview
        const url = URL.createObjectURL(imageInput.files[0]);
        previewContainer.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:contain;">`;
    }
};

// --- Generate Handler ---
const handleGenerate = async () => {
    setStatus('正在处理...');
    generateBtn.disabled = true;

    try {
        if (typeof JSZip === 'undefined') throw new Error('JSZip lib missing');

        const zip = new JSZip();
        
        if (currentMode === 'gallery') {
            await generateGalleryPackage(zip);
        } else {
            await generateMomentsPackage(zip);
        }

        setStatus('打包中...');
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const dateStr = dateInput.value || 'data';
        downloadBlob(zipBlob, `love-minnie-${currentMode}-${dateStr}.zip`);
        setStatus('成功！下载已开始。');

    } catch (err) {
        console.error(err);
        setStatus(`错误: ${err.message}`);
    } finally {
        generateBtn.disabled = false;
    }
};

const generateGalleryPackage = async (zip) => {
    // 1. Validate
    if (!imageInput.files[0] && !existingImageBlob) throw new Error('请选择图片');
    
    // 2. Process Image
    const date = new Date(dateInput.value);
    const filename = getFileNameFromDate(date);
    let blob = imageInput.files[0] ? await compressToWebp(imageInput.files[0]) : existingImageBlob;
    
    zip.folder('images').file(filename, blob);

    // 3. Update JSON
    // Only simple logic here: create the snippet to replace/add
    const dateStr = formatDateISO(date);
    const newItem = {
        id: filename.replace('.webp',''),
        date: dateStr,
        filename: filename,
        loveLetter: letterInput.value
    };
    
    // Filter out old entry for same date
    const newHistory = existingData.filter(d => d.date !== dateStr);
    newHistory.push(newItem);
    newHistory.sort((a,b) => new Date(b.date) - new Date(a.date));

    zip.file('data.json', JSON.stringify(newHistory, null, 4));
    zip.file('data.js', `window.__GALLERY_DATA__ = ${JSON.stringify(newHistory)};`);
};

const generateMomentsPackage = async (zip) => {
    // 1. Validate
    if (imageInput.files.length === 0) throw new Error('请至少选择一张图片');
    if (!titleInput.value) throw new Error('请输入标题');

    const dateStr = dateInput.value; // YYYY-MM-DD
    const safeTitle = titleInput.value.replace(/[^\w\u4e00-\u9fa5]/g, '_'); // Basic sanitize
    const baseId = `${dateStr.replace(/-/g, '')}_${safeTitle}`;
    
    const photoList = [];
    const files = Array.from(imageInput.files);
    
    setStatus(`正在压缩 ${files.length} 张图片...`);
    
    // 2. Process Images
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const blob = await compressToWebp(file);
        const idx = String(i + 1).padStart(2, '0');
        // Naming: 20260111_Xian_01.webp
        const fileName = `${baseId}_${idx}.webp`;
        
        zip.folder('images').file(fileName, blob);
        photoList.push(fileName);
    }

    // 3. Generate Code Snippet
    const momentEntry = {
        id: baseId,
        date: dateStr,
        title: titleInput.value,
        description: letterInput.value,
        photos: photoList
    };

    const codeSnippet = `
// 复制以下代码到 moments_data.js 的 MOMENTS_DATA 数组中:
/*
${JSON.stringify(momentEntry, null, 4)},
*/
    `;
    
    zip.file('moments_snippet.js', codeSnippet);
    zip.file('moments.json', JSON.stringify(momentEntry, null, 4));
};

// --- Init ---
modeBtns.forEach(btn => {
    btn.addEventListener('click', () => switchMode(btn.dataset.mode));
});

form.addEventListener('input', () => {
    if (currentMode === 'gallery') updateGalleryPreview();
    else updateMomentsPreview();
});

generateBtn.addEventListener('click', handleGenerate);

// Initialize default date
dateInput.valueAsDate = new Date();
switchMode('gallery');
