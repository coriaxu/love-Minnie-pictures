// 频繁的局部切换在原页面完成。只有跨页遇到同一封画信才连接两个画框。
(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const active = new Map();
    const root = document.documentElement;
    let timing;

    function enter(el, x = 0, y = 0) {
        if (!el || preference.matches || !el.animate || document.hidden) return;
        if (!timing) {
            const css = getComputedStyle(root);
            timing = { duration: parseFloat(css.getPropertyValue('--lm-feedback')), easing: css.getPropertyValue('--lm-ease').trim() };
        }
        let from = { opacity: .72, translate: `${x}px ${y}px` };
        const previous = active.get(el);
        if (previous) {
            const css = getComputedStyle(el);
            from = { opacity: css.opacity, translate: css.translate };
            previous.cancel();
        }
        const animation = el.animate([from, { opacity: 1, translate: '0px 0px' }], timing);
        active.set(el, animation);
        const clear = () => { if (active.get(el) === animation) active.delete(el); };
        animation.onfinish = animation.oncancel = clear;
    }

    preference.addEventListener('change', () => {
        if (preference.matches) active.forEach(animation => animation.cancel());
    });
    window.LoveMotion = { enter, preference };

    const travelKey = 'lm-art-travel';
    function visibleArt() {
        const moon = document.querySelector('#home-moon.has-art:not(.is-swapping)');
        if (moon) return moon;
        return document.querySelector('.detail-modal.open #detail-image, body:not(.modal-open) #view-today:not([hidden]) .today-hero:not([hidden]) #today-hero-img');
    }
    function share(transition, el, name = 'lm-art') {
        el.style.viewTransitionName = name;
        transition.finished.finally(() => { el.style.viewTransitionName = ''; });
    }
    addEventListener('pageswap', event => {
        if (!event.viewTransition || preference.matches || !event.activation) return;
        const art = visibleArt();
        if (!art?.dataset.date) return;
        const to = new URL(event.activation.entry.url);
        const home = art.id === 'home-moon';
        if (home ? to.href !== art.href : !/\/(index\.html)?$/.test(to.pathname)) return;
        try {
            sessionStorage.setItem(travelKey, JSON.stringify({ to: to.href, date: art.dataset.date, at: Date.now() }));
            share(event.viewTransition, art);
        } catch { /* 隐私模式使用整页淡入。 */ }
    });
    addEventListener('pagereveal', event => {
        let travel;
        try {
            travel = JSON.parse(sessionStorage.getItem(travelKey));
            sessionStorage.removeItem(travelKey);
        } catch { return; }
        if (!event.viewTransition || preference.matches || !travel || travel.to !== location.href || Date.now() - travel.at > 10000) return;
        const art = visibleArt();
        if (art?.dataset.date !== travel.date) return;
        root.classList.add('vt-arrive');
        share(event.viewTransition, art);
        if (art.id === 'today-hero-img') share(event.viewTransition, document.querySelector('.hero-letter-col'), 'lm-letter');
        event.viewTransition.finished.finally(() => root.classList.remove('vt-arrive'));
    });
})();
