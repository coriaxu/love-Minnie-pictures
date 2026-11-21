/* iPhone 15 Pro 外壳（393×852）。
 * 逐项照搬 huashu-design assets/ios_frame.jsx 的常量：bezel 12、外圆角 60、屏圆角 48、
 * 灵动岛 124×36 top 12、状态栏高 54、内容区 top 54 / bottom 34、Home Indicator 140×5 bottom 10。
 * 原型用原生 JS，不走 React/Babel CDN（熊老婆的手机不挂 VPN，仓库约定不引外部 CDN）。
 */
(function () {
  const css = `
  .ios-wrap{display:inline-block;padding:12px;background:#000;border-radius:60px;position:relative;
    box-shadow:0 0 0 2px #1f2937,0 20px 60px rgba(0,0,0,.3)}
  .ios-screen{position:relative;border-radius:48px;overflow:hidden;width:393px;height:852px}
  .ios-status{position:absolute;top:0;left:0;right:0;height:54px;display:flex;align-items:center;
    justify-content:space-between;padding:0 32px;font:600 16px -apple-system,"SF Pro Text",sans-serif;
    z-index:20;pointer-events:none}
  .ios-island{position:absolute;top:12px;left:50%;transform:translateX(-50%);width:124px;height:36px;
    background:#000;border-radius:999px;z-index:30}
  .ios-icons{display:flex;align-items:center;gap:6px}
  .ios-signal{display:flex;align-items:flex-end;gap:2px;height:12px}
  .ios-signal i{width:3px;background:currentColor;border-radius:1px;display:block}
  .ios-batt{width:26px;height:12px;border:1.5px solid currentColor;border-radius:3px;padding:1px;
    position:relative;opacity:.8;box-sizing:border-box}
  .ios-batt b{display:block;height:100%;background:currentColor;border-radius:1px;opacity:.9}
  .ios-batt s{position:absolute;top:3px;right:-3px;width:2px;height:6px;background:currentColor;border-radius:0 1px 1px 0}
  .ios-content{position:absolute;top:54px;left:0;right:0;bottom:34px;overflow:hidden}
  .ios-content.full{top:0;bottom:0}
  .ios-home{position:absolute;bottom:10px;left:50%;transform:translateX(-50%);width:140px;height:5px;
    background:rgba(0,0,0,.3);border-radius:999px;z-index:40;pointer-events:none}
  .ios-dark .ios-home{background:rgba(255,255,255,.5)}
  `;
  const st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  /* full=true：内容铺到状态栏和 Home 条下面（全屏画作、锁屏），外壳照样画岛和状态栏 */
  window.iosFrame = function ({ dark = false, time = '9:41', battery = 85, full = false, bg } = {}) {
    const color = dark ? '#fff' : '#000';
    const wrap = document.createElement('div');
    wrap.className = 'ios-wrap' + (dark ? ' ios-dark' : '');
    wrap.innerHTML = `
      <div class="ios-screen" style="background:${bg || (dark ? '#000' : '#fff')}">
        <div class="ios-status" style="color:${color}">
          <span>${time}</span>
          <div class="ios-icons">
            <div class="ios-signal"><i style="height:4px"></i><i style="height:6px"></i><i style="height:9px"></i><i style="height:11px"></i></div>
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none" style="color:${color}">
              <path d="M8 11.5a1 1 0 100-2 1 1 0 000 2z" fill="currentColor"/>
              <path d="M3 7.5a7 7 0 0110 0" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round"/>
              <path d="M1 4.5a11 11 0 0114 0" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".7"/>
            </svg>
            <div class="ios-batt"><b style="width:${battery}%"></b><s></s></div>
          </div>
        </div>
        <div class="ios-island"></div>
        <div class="ios-content${full ? ' full' : ''}"></div>
        <div class="ios-home"></div>
      </div>`;
    return { el: wrap, content: wrap.querySelector('.ios-content'), screen: wrap.querySelector('.ios-screen') };
  };

  /* 共用的小工具 */
  const WEEK = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const START = new Date(2009, 11, 10); // 在一起的第 1 天，与首页 js/home.js 同一口径
  window.LM = {
    data: window.LM_DATA,
    today: '2026-11-21',
    parse(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); },
    week(s) { return WEEK[LM.parse(s).getDay()]; },
    isWeekend(s) { const d = LM.parse(s).getDay(); return d === 0 || d === 6; },
    together(s) { return Math.round((LM.parse(s) - START) / 864e5) + 1; },
    nth(s) { return LM.data.length - LM.data.findIndex(e => e.date === s); },
    byDate(s) { return LM.data.find(e => e.date === s); },
    md(s) { const d = LM.parse(s); return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')}`; },
    /* 纪念日：与 js/anniversary-effects.js、个人档案一致 */
    anniversaries: [
      { md: '12-10', name: '恋爱纪念日', since: 2009 },
      { md: '12-16', name: '领证纪念日', since: 2017 },
      { md: '09-22', name: '熊老婆生日', since: 1990 },
      { md: '10-03', name: '婚礼纪念日', since: 2018 },
    ],
    upcoming(from) {
      const t = LM.parse(from);
      return LM.anniversaries.map(a => {
        const [m, d] = a.md.split('-').map(Number);
        let y = t.getFullYear(); let dt = new Date(y, m - 1, d);
        if (dt < t) { y += 1; dt = new Date(y, m - 1, d); }
        return { ...a, date: dt, year: y, nthYear: y - a.since, days: Math.round((dt - t) / 864e5) };
      }).sort((a, b) => a.days - b.days);
    },
    cn(n) { // 0–99 的中文数字
      const D = '〇一二三四五六七八九';
      if (n < 10) return D[n];
      if (n < 20) return '十' + (n % 10 ? D[n % 10] : '');
      return D[Math.floor(n / 10)] + '十' + (n % 10 ? D[n % 10] : '');
    },
    h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; },
  };
})();
