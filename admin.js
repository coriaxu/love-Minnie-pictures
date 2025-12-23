const MAX_WIDTH = 1600;
const WEBP_QUALITY = 0.85;
const RELATIONSHIP_START = new Date('2009-12-10T00:00:00');
const PROJECT_START = new Date('2026-01-01T00:00:00');

const form = document.getElementById('publish-form');
const dateInput = document.getElementById('entry-date');
const imageInput = document.getElementById('entry-image');
const letterInput = document.getElementById('entry-letter');
const fileNameEl = document.getElementById('file-name');
const dayNoEl = document.getElementById('day-no');
const statusText = document.getElementById('status-text');
const previewImage = document.getElementById('preview-image');
const previewTitle = document.getElementById('preview-title');
const previewSub = document.getElementById('preview-sub');
const generateBtn = document.getElementById('generate-btn');

const existingData = Array.isArray(window.__GALLERY_DATA__) ? [...window.__GALLERY_DATA__] : [];
let existingImageBlob = null; // Store blob if editing existing entry

const setStatus = (message) => {
    if (statusText) statusText.textContent = message;
};

const toUtcDay = (date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
const diffDays = (start, end) => Math.floor((toUtcDay(end) - toUtcDay(start)) / (1000 * 60 * 60 * 24));

const getRelationshipDay = (date) => Math.max(1, diffDays(RELATIONSHIP_START, date) + 1);

const getNoNumber = (date, index) => {
    const today = new Date();
    const useRealNo = toUtcDay(today) >= toUtcDay(PROJECT_START);
    if (!useRealNo) return index + 1;
    const diff = diffDays(PROJECT_START, date) + 1;
    return diff > 0 ? diff : index + 1;
};

const formatDateDisplay = (date) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
};

const normalizeDateValue = (value) => {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
};

const getFileNameFromDate = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}.webp`;
};

const updatePreview = () => {
    const dateValue = normalizeDateValue(dateInput.value);
    const file = imageInput.files && imageInput.files[0];

    if (!dateValue) {
        fileNameEl.textContent = '-';
        dayNoEl.textContent = '-';
        previewTitle.textContent = '日期未选择';
        previewSub.textContent = 'Day / No. 将自动计算';
        return;
    }

    const filename = getFileNameFromDate(dateValue);
    fileNameEl.textContent = filename;

    const sorted = sortDataWithPending(dateValue, filename);
    const index = sorted.findIndex(item => item.date === formatDateISO(dateValue));
    const dayNum = getRelationshipDay(dateValue);
    const noNum = getNoNumber(dateValue, Math.max(index, 0));

    dayNoEl.textContent = `Day ${String(dayNum).padStart(3, '0')} · No. ${String(noNum).padStart(3, '0')}`;
    previewTitle.textContent = formatDateDisplay(dateValue);
    previewSub.textContent = `Day ${String(dayNum).padStart(3, '0')} · No. ${String(noNum).padStart(3, '0')}`;

    if (file) {
        const url = URL.createObjectURL(file);
        previewImage.innerHTML = `<img src="${url}" alt="preview">`;
        previewImage.querySelector('img').onload = () => URL.revokeObjectURL(url);
    }
};

const formatDateISO = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const sortDataWithPending = (dateValue, filename) => {
    const dateStr = formatDateISO(dateValue);
    const updated = existingData.filter(item => item.date !== dateStr);
    updated.push({
        date: dateStr,
        filename,
        title: formatDateDisplay(dateValue),
        description: '',
        music: '',
        loveLetter: letterInput.value || ''
    });
    return updated.sort((a, b) => new Date(b.date) - new Date(a.date));
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

    if (!blob) {
        throw new Error('图片压缩失败');
    }

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

const buildDataFiles = (updatedData) => {
    const json = JSON.stringify(updatedData, null, 4);
    const js = `window.__GALLERY_DATA__ = ${JSON.stringify(updatedData)};\n`;
    return { json, js };
};

const handleGenerate = async () => {
    if (!dateInput.value) {
        setStatus('请先选择日期。');
        return;
    }
    if ((!imageInput.files || !imageInput.files[0]) && !existingImageBlob) {
        setStatus('请选择图片（或等待原图加载）。');
        return;
    }
    if (!letterInput.value.trim()) {
        setStatus('请写下今天的悄悄话。');
        return;
    }

    const dateValue = normalizeDateValue(dateInput.value);
    if (!dateValue) {
        setStatus('日期格式不正确。');
        return;
    }

    if (typeof JSZip === 'undefined') {
        setStatus('JSZip 未加载，无法生成 zip。');
        return;
    }

    try {
        setStatus('正在压缩图片...');
        generateBtn.disabled = true;

        const file = imageInput.files[0];
        const filename = getFileNameFromDate(dateValue);

        let imageBlob;
        if (file) {
            imageBlob = await compressToWebp(file);
        } else if (existingImageBlob) {
            imageBlob = existingImageBlob;
        } else {
            throw new Error('No image source found');
        }

        setStatus('正在更新数据...');

        const dateStr = formatDateISO(dateValue);
        const updated = existingData.filter(item => item.date !== dateStr);
        updated.push({
            id: filename.replace('.webp', ''),
            date: dateStr,
            filename,
            title: formatDateDisplay(dateValue),
            description: '',
            music: '',
            loveLetter: letterInput.value.trim()
        });
        updated.sort((a, b) => new Date(b.date) - new Date(a.date));

        const { json, js } = buildDataFiles(updated);

        setStatus('正在生成发布包...');
        const zip = new JSZip();
        zip.file('data.json', json);
        zip.file('data.js', js);
        zip.folder('images').file(filename, imageBlob);

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, `love-minnie-${dateStr}.zip`);
        setStatus('发布包已下载，可以上传到 GitHub。');
    } catch (error) {
        console.error(error);
        setStatus(`生成失败：${error.message}`);
    } finally {
        generateBtn.disabled = false;
    }
};

const setTodayIfEmpty = () => {
    if (!dateInput.value) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${yyyy}-${mm}-${dd}`;
    }
};

const checkPreFill = async () => {
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get('date');
    if (!dateParam) {
        setTodayIfEmpty();
        return;
    }

    const item = existingData.find(d => d.date === dateParam);
    if (item) {
        dateInput.value = item.date;
        letterInput.value = item.loveLetter || item.description || '';

        // Load existing image
        try {
            const response = await fetch(`images/${item.filename}`);
            if (response.ok) {
                existingImageBlob = await response.blob();
                // Create preview from blob
                const url = URL.createObjectURL(existingImageBlob);
                previewImage.innerHTML = `<img src="${url}" alt="preview">`;
                // Don't revoke immediately, let preview stay
            }
        } catch (e) {
            console.error('Failed to load existing image', e);
        }

        updatePreview(); // Trigger text updates
        setStatus('已加载历史内容，可直接修改。');
    } else {
        setTodayIfEmpty();
    }
};

checkPreFill();
updatePreview();

if (form) {
    form.addEventListener('input', updatePreview);
}

if (generateBtn) {
    generateBtn.addEventListener('click', handleGenerate);
}
