/**
 * Typeset · 中文短句断行
 *
 * 目标：任何屏宽下都不出现"9月22 / 日""老婆生 / 日快乐"这种把词拆开、把单字挤到下一行的断行。
 *
 * 做法：把文字切成"不可拆的单元"（.ts-u，CSS 里是 white-space: nowrap），只允许在单元之间换行。
 *   1. 空格和标点之后是天然断点；数字、字母两侧的空格不算（"第 6134 天"要连在一起）。
 *   2. 短单元（≤ 12 字）整体不拆。
 *   3. 长单元按词切（Intl.Segmenter），日期和带单位的数字整体保护，句尾至少 3 个字粘在一起，杜绝孤字成行。
 *   4. 标题用 fit() 按容器宽度缩放字号，保证最长的单元放得下；字体加载完成、窗口尺寸变化后自动重排。
 */
(function () {
    'use strict';

    const escapeHtml = (text) => String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    // 这些标点之后可以换行（标点本身跟着前一个字）
    const BREAK_AFTER = '，。！？、；：～…,.!?;:~）」』”’》〉】';
    // 半角标点夹在字母数字中间时（26.12.24、16:9、3.5）不是断点
    const ASCII_PUNCT = ',.!?;:~';
    const ALNUM = /[0-9A-Za-z]/;
    const DIGIT = /[0-9]/;
    const CJK = /[㐀-鿿豈-﫿]/;
    const LONG_UNIT = 12;
    const TAIL = 3;
    // 日期、带单位的数字、点分数字：整体不拆
    const PROTECT = /(?:\d{2,4}\s?年\s?)?\d{1,2}\s?月\s?\d{1,2}\s?[日号]|第\s?\d+\s?[天封年次个颗]|\d+(?:[.:/]\d+)+|\d+(?:\.\d+)?\s?[年月日号天封岁次个颗点%]?/g;

    const segmenter = (typeof Intl !== 'undefined' && Intl.Segmenter)
        ? new Intl.Segmenter('zh', { granularity: 'word' })
        : null;

    const isSpace = (ch) => /[\s　]/.test(ch);
    const isPunct = (ch) => BREAK_AFTER.includes(ch);

    // 数字和汉字之间的空格要连在一起（"第 6134 天""2026 世界杯"），英文单词之间的空格照常断行
    const isTightSpace = (prev, next) =>
        (DIGIT.test(prev) && (CJK.test(next) || DIGIT.test(next))) ||
        (CJK.test(prev) && DIGIT.test(next));

    const canBreakAfter = (ch, next) => {
        if (!BREAK_AFTER.includes(ch) || BREAK_AFTER.includes(next)) return false;
        if (ASCII_PUNCT.includes(ch) && ALNUM.test(next)) return false;
        return true;
    };

    // 切成 [{ text, sep }]，sep 为单元后的分隔（' ' 或 ''）
    function splitUnits(text) {
        const chars = Array.from(String(text));
        const units = [];
        let buf = '';
        for (let i = 0; i < chars.length; i++) {
            const ch = chars[i];
            if (isSpace(ch)) {
                const prev = chars[i - 1] || '';
                const next = chars[i + 1] || '';
                if (buf && isTightSpace(prev, next)) {
                    buf += ' ';
                    continue;
                }
                if (buf) {
                    units.push({ text: buf, sep: ' ' });
                } else if (units.length) {
                    // 标点后面跟着的空格（"canvas, twisting"）要保留
                    units[units.length - 1].sep = ' ';
                }
                buf = '';
                continue;
            }
            buf += ch;
            if (canBreakAfter(ch, chars[i + 1] || '')) {
                units.push({ text: buf, sep: '' });
                buf = '';
            }
        }
        if (buf) units.push({ text: buf, sep: '' });
        return units;
    }

    // 长单元：按词切，保护日期数字，句尾粘住
    function renderLongUnit(text) {
        const chars = Array.from(text);
        const n = chars.length;
        // 1. 每个字所属的"词"编号：先按分词，再把日期/数字整段并成一个词
        const wordOf = new Array(n);
        let wordId = 0;
        if (segmenter) {
            let pos = 0;
            for (const seg of segmenter.segment(text)) {
                const len = Array.from(seg.segment).length;
                for (let k = 0; k < len; k++) wordOf[pos + k] = wordId;
                pos += len;
                wordId++;
            }
        } else {
            for (let k = 0; k < n; k++) wordOf[k] = wordId++;
        }
        const relabel = (from, to, startAt) => {
            for (let k = startAt; k < n; k++) if (wordOf[k] === from) wordOf[k] = to;
        };
        const codeUnitToChar = [];
        chars.forEach((ch, idx) => { for (let u = 0; u < ch.length; u++) codeUnitToChar.push(idx); });
        PROTECT.lastIndex = 0;
        let m;
        while ((m = PROTECT.exec(text)) !== null) {
            if (!m[0]) { PROTECT.lastIndex++; continue; }
            const start = codeUnitToChar[m.index];
            const end = codeUnitToChar[m.index + m[0].length - 1];
            const id = wordId++;
            for (let k = start; k <= end; k++) wordOf[k] = id;
        }
        // 数字和汉字之间的空格连成一个词（"第 6134 天"）
        for (let k = 1; k < n - 1; k++) {
            if (isSpace(chars[k]) && isTightSpace(chars[k - 1], chars[k + 1])) {
                const keep = wordOf[k - 1];
                wordOf[k] = keep;
                relabel(wordOf[k + 1], keep, k + 1);
            }
        }
        // 标点并入前一个词（标点不单独成行首）
        for (let k = 1; k < n; k++) {
            if (isPunct(chars[k]) && !isSpace(chars[k - 1])) wordOf[k] = wordOf[k - 1];
        }
        // 2. 句尾粘住：最后 TAIL 个非标点字符及其后的标点合成一个词（不跨过英文单词间的空格）
        let counted = 0;
        let tailStart = n;
        for (let k = n - 1; k >= 0; k--) {
            if (isSpace(chars[k]) && wordOf[k] !== wordOf[k + 1]) break;
            tailStart = k;
            if (!isPunct(chars[k]) && !isSpace(chars[k])) counted++;
            if (counted >= TAIL) break;
        }
        while (tailStart > 0 && wordOf[tailStart - 1] === wordOf[tailStart]) tailStart--;
        const tailId = wordId++;
        for (let k = tailStart; k < n; k++) {
            if (isSpace(chars[k]) && wordOf[k] !== wordOf[k - 1]) continue;
            wordOf[k] = tailId;
        }

        // 3. 按词输出 nowrap 单元；词与词之间的空格原样留着，作为断点
        let html = '';
        let current = '';
        let currentId = null;
        const flush = () => {
            if (current) html += `<span class="ts-u">${escapeHtml(current)}</span>`;
            current = '';
            currentId = null;
        };
        for (let k = 0; k < n; k++) {
            const ch = chars[k];
            const inWord = currentId !== null && wordOf[k] === currentId;
            if (isSpace(ch) && !inWord) {
                flush();
                html += ' ';
                continue;
            }
            if (!inWord) flush();
            current += ch;
            currentId = wordOf[k];
        }
        flush();
        return html;
    }

    // 一行文字 → 带断行控制的 HTML
    function lineHtml(text) {
        return splitUnits(text).map(({ text: unit, sep }) => {
            const body = Array.from(unit).length <= LONG_UNIT
                ? `<span class="ts-u">${escapeHtml(unit)}</span>`
                : renderLongUnit(unit);
            return body + (sep ? ' ' : '<wbr>');
        }).join('');
    }

    // 多行文字（保留原文换行）→ HTML
    function html(text) {
        return String(text ?? '')
            .split(/\r?\n/)
            .map(line => lineHtml(line.trim()))
            .join('<br>');
    }

    // 整段不拆（日期、按钮、短标签）
    function nowrap(text) {
        return `<span class="ts-u">${escapeHtml(text)}</span>`;
    }

    // 若干片段，片段内不拆，片段之间用分隔符连接并允许换行
    function join(parts, separator = ' · ') {
        return parts.filter(Boolean)
            .map(nowrap)
            .join(`<span class="ts-sep">${escapeHtml(separator)}</span><wbr>`);
    }

    // ----------------------------------------------------------------
    // 标题字号自适应
    // ----------------------------------------------------------------
    const fitted = new Set();

    function countLines(el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const tops = new Set();
        for (const rect of range.getClientRects()) {
            if (rect.width > 0.5) tops.add(Math.round(rect.top));
        }
        return tops.size;
    }

    // 看画页打开时带缩放动画（scale 0.98 → 1），量宽度要扣掉 transform，否则会在动画途中量小
    function scaleOf(el) {
        const layoutWidth = el.offsetWidth;
        return layoutWidth ? (el.getBoundingClientRect().width / layoutWidth) || 1 : 1;
    }

    function widestUnit(el) {
        const scale = scaleOf(el);
        let widest = 0;
        el.querySelectorAll('.ts-u').forEach(unit => {
            widest = Math.max(widest, unit.getBoundingClientRect().width / scale);
        });
        return widest;
    }

    // 留一点余量：字距和亚像素取整不至于让字贴到边上
    const SAFETY = 4;

    // 最小字号下仍放不下的词组，拆成按词的小单元，允许在词与词之间换行
    function splitOverflowingUnits(el, avail) {
        const scale = scaleOf(el);
        let changed = false;
        el.querySelectorAll('.ts-u').forEach(unit => {
            if (unit.getBoundingClientRect().width / scale <= avail) return;
            const text = unit.textContent;
            const finer = renderLongUnit(text);
            if (finer.split('class="ts-u"').length - 1 <= 1) {
                // 单个词本身都放不下（很少见）：只好允许词内换行
                unit.classList.remove('ts-u');
            } else {
                unit.outerHTML = finer;
            }
            changed = true;
        });
        return changed;
    }

    function applyFit(el, opts) {
        if (!el.isConnected || el.offsetParent === null) return;
        const { max, min, maxLines = 1 } = opts;
        const avail = el.clientWidth - SAFETY;
        if (avail <= 0) return;
        // 内容被外部换过（新的一封）就以当前内容为原稿；否则先还原成原稿再量，避免上次拆细的结果累积
        if (el._tsHtml === undefined || el.innerHTML !== el._tsLastOut) {
            el._tsHtml = el.innerHTML;
        } else if (el.innerHTML !== el._tsHtml) {
            el.innerHTML = el._tsHtml;
        }
        let size = max;
        el.style.fontSize = `${size}px`;
        const widest = widestUnit(el);
        if (widest > avail) {
            size = Math.max(min, Math.floor(size * (avail / widest) * 100) / 100 - 0.5);
            el.style.fontSize = `${size}px`;
        }
        let guard = 40;
        while (size > min && guard-- > 0 && (countLines(el) > maxLines || widestUnit(el) > avail)) {
            size = Math.max(min, size - 1);
            el.style.fontSize = `${size}px`;
        }
        if (widestUnit(el) > avail) splitOverflowingUnits(el, avail);
        el._tsLastOut = el.innerHTML;
    }

    // 登记后，字体加载完成与窗口尺寸变化时自动重算
    function fit(el, opts) {
        if (!el) return;
        el._tsFit = opts;
        fitted.add(el);
        applyFit(el, opts);
    }

    // 取消登记并清掉内联字号（例如同一个标题换成长句时）
    function unfit(el) {
        if (!el) return;
        fitted.delete(el);
        el._tsFit = null;
        el._tsHtml = undefined;
        el._tsLastOut = undefined;
        el.style.fontSize = '';
    }

    function refitAll() {
        fitted.forEach(el => {
            if (!el.isConnected) {
                fitted.delete(el);
                return;
            }
            applyFit(el, el._tsFit);
        });
    }

    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(refitAll, 120);
    });
    if (document.fonts) {
        document.fonts.ready.then(refitAll);
        document.fonts.addEventListener?.('loadingdone', refitAll);
    }

    // ----------------------------------------------------------------
    // 画信文字解析："♥️ 今日份爱你 中秋节快乐" → { theme: '中秋节快乐', ritual: true }
    // ----------------------------------------------------------------
    function parseLetter(raw) {
        const text = String(raw ?? '').replace(/\uFE0F/g, '').trim();
        const lines = text.split(/\r?\n/);
        const first = lines[0].replace(/^[♥❤]\s*/, '').trim();
        const rest = lines.slice(1).join('\n').trim();
        const ritual = /今日份爱你/.test(first);
        let theme = first
            .replace(/[，,、\s]*今日份爱你[，,、!！~～:：\-－—–\s]*/, ' ')
            .replace(/[♥❤]/g, '')
            .trim();
        // "今日份爱你-日式漫画风格"：开头结尾的分隔符不进标题
        theme = theme.replace(/^[，,、:：\-－—–\s]+|[，,、:：\-－—–\s]+$/g, '');
        return { theme, ritual, rest };
    }

    window.Typeset = { html, nowrap, join, fit, unfit, refitAll, parseLetter, escapeHtml };
})();
