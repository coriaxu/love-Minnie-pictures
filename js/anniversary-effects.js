/**
 * Anniversary Effects Engine (纪念日特效引擎)
 * 根据特定日期自动触发精美的视觉庆祝效果
 * 
 * @version 1.0
 * @see ANNIVERSARY_EFFECTS.md 查看设计规范
 */

(function () {
    'use strict';

    // ============================================================
    // 配置：纪念日列表
    //
    // 字段说明：
    //   date  : 'MM-DD' —— 每年触发的循环纪念日
    //   once  : 'YYYY-MM-DD' —— 仅在指定日期触发一次（once-in-a-lifetime）
    //   带 once 的条目优先于 date 匹配，命中后该条目仅当年生效
    // ============================================================
    const ANNIVERSARIES = [
        {
            id: 'day-6000',
            once: '2026-05-14',
            name: '6000 天纪念日',
            type: 'C', // 沉浸叙事 (Personal Cinema)
            effect: 'day-6000',
            // 不使用标准 overlay，由 window.Day6000 模块独立渲染
        },
        {
            id: 'birthday',
            date: '09-22',
            name: 'Minnie 生日',
            type: 'A', // 盛大庆典
            title: 'Happy Birthday, My Minnie',
            effect: 'butterfly',
            colors: ['#E8B4E8', '#FFC7D4', '#B8E8D2', '#FFD700']
        },
        {
            id: 'love-anniversary',
            date: '12-10',
            name: '恋爱纪念日',
            type: 'A',
            title: '16 Years of Love',
            effect: 'golden-shapes',
            colors: ['#D4A574', '#F5DEB3', '#C9A86C', '#FFFAF0']
        },
        {
            id: 'wedding',
            date: '12-16',
            name: '结婚纪念日',
            type: 'B', // 沉浸氛围
            effect: 'rose-petals',
            colors: ['#8B0000', '#A52A2A', '#800020', '#FFD1DC']
        },
        {
            id: 'new-year',
            date: '01-01',
            name: '新年',
            type: 'B',
            title: 'Happy New Year, My Love',
            effect: 'fireworks',
            colors: ['#FFD700', '#E8B4D8', '#87CEEB']
        },
        {
            id: 'valentine',
            date: '02-14',
            name: '情人节',
            type: 'A',
            title: 'Be My Valentine, Forever',
            effect: 'neon-hearts',
            colors: ['#FF1493', '#FF6B6B', '#FF69B4', '#E040FB', '#00FFFF']
        }
    ];

    // 存储 Key（防止同一天重复触发）
    const STORAGE_KEY = 'love-minnie-anniversary-shown';

    // ============================================================
    // 工具函数
    // ============================================================
    const getTodayString = () => {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${month}-${day}`;
    };

    const getTodayFullString = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // 找到今天对应的纪念日：once 字段优先（精确到年），其次 date 字段（按 MM-DD 循环）
    const findTodayAnniversary = () => {
        const todayFull = getTodayFullString();
        const todayShort = getTodayString();
        const onceMatch = ANNIVERSARIES.find(a => a.once === todayFull);
        if (onceMatch) return onceMatch;
        return ANNIVERSARIES.find(a => a.date === todayShort);
    };

    const hasShownToday = (id) => {
        try {
            const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            return data[id] === getTodayString();
        } catch {
            return false;
        }
    };

    const markAsShown = (id) => {
        try {
            const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            data[id] = getTodayString();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('Anniversary: Failed to save state', e);
        }
    };

    // 检查用户是否偏好减少动态效果
    const prefersReducedMotion = () => {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    };

    // ============================================================
    // 特效容器管理
    // ============================================================
    let effectsContainer = null;
    let textOverlay = null;

    const createEffectsContainer = () => {
        if (effectsContainer) return effectsContainer;

        effectsContainer = document.createElement('div');
        effectsContainer.id = 'anniversary-effects';
        effectsContainer.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 9998;
            pointer-events: none;
            overflow: hidden;
        `;
        document.body.appendChild(effectsContainer);
        return effectsContainer;
    };

    const createTextOverlay = (title, colors) => {
        textOverlay = document.createElement('div');
        textOverlay.id = 'anniversary-text';
        textOverlay.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.6);
            opacity: 0;
            transition: opacity 0.8s ease;
            pointer-events: none;
        `;

        const text = document.createElement('h1');
        text.textContent = title;
        text.style.cssText = `
            font-family: 'Bodoni Moda', 'LXGW WenKai Screen', serif;
            font-size: clamp(2rem, 8vw, 5rem);
            font-weight: 400;
            font-style: italic;
            color: ${colors[0]};
            text-shadow: 
                0 0 20px ${colors[0]}80,
                0 0 40px ${colors[1] || colors[0]}60,
                0 0 60px ${colors[2] || colors[0]}40;
            text-align: center;
            padding: 0 20px;
            transform: translateY(20px);
            opacity: 0;
            transition: all 1s cubic-bezier(0.19, 1, 0.22, 1);
        `;

        textOverlay.appendChild(text);
        document.body.appendChild(textOverlay);

        // 触发动画
        requestAnimationFrame(() => {
            textOverlay.style.opacity = '1';
            text.style.opacity = '1';
            text.style.transform = 'translateY(0)';
        });

        return textOverlay;
    };

    const removeTextOverlay = (delay = 3000) => {
        if (!textOverlay) return;
        setTimeout(() => {
            if (textOverlay) {
                textOverlay.style.opacity = '0';
                setTimeout(() => {
                    textOverlay?.remove();
                    textOverlay = null;
                }, 800);
            }
        }, delay);
    };

    const removeEffectsContainer = (delay = 5000) => {
        setTimeout(() => {
            if (effectsContainer) {
                effectsContainer.style.transition = 'opacity 1s ease';
                effectsContainer.style.opacity = '0';
                setTimeout(() => {
                    effectsContainer?.remove();
                    effectsContainer = null;
                }, 1000);
            }
        }, delay);
    };

    // ============================================================
    // 方案 A: 盛大庆典特效
    // ============================================================

    // 蝴蝶飞舞 (生日)
    const playButterflyEffect = (colors) => {
        const container = createEffectsContainer();
        const butterflies = [];
        const count = 35;

        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const butterfly = document.createElement('div');
                butterfly.className = 'effect-butterfly';
                const size = 30 + Math.random() * 40;
                const startX = 20 + Math.random() * 60; // 从中间区域起飞
                const startY = 100 + Math.random() * 20; // 屏幕底部
                const endX = startX + (Math.random() - 0.5) * 60;
                const endY = -20 - Math.random() * 30;
                const duration = 4000 + Math.random() * 3000;
                const delay = Math.random() * 500;
                const rotation = Math.random() * 360;
                const colorIndex = Math.floor(Math.random() * (colors.length - 1));

                butterfly.style.cssText = `
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    left: ${startX}%;
                    top: ${startY}%;
                    background-image: url('images/effects/butterfly.svg');
                    background-size: contain;
                    background-repeat: no-repeat;
                    filter: hue-rotate(${colorIndex * 40}deg) drop-shadow(0 0 8px ${colors[colorIndex]});
                    opacity: 0;
                    transform: rotate(${rotation}deg) scale(0);
                    animation: 
                        butterflyFly ${duration}ms ${delay}ms ease-out forwards,
                        butterflyWing 200ms ease-in-out infinite;
                    --end-x: ${endX}%;
                    --end-y: ${endY}%;
                `;

                container.appendChild(butterfly);
                butterflies.push(butterfly);
            }, i * 80);
        }

        // 添加金色星尘
        for (let i = 0; i < 60; i++) {
            setTimeout(() => {
                const sparkle = document.createElement('div');
                sparkle.className = 'effect-sparkle';
                const size = 4 + Math.random() * 6;
                const x = 10 + Math.random() * 80;
                const duration = 2000 + Math.random() * 2000;

                sparkle.style.cssText = `
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    left: ${x}%;
                    top: 100%;
                    background: radial-gradient(circle, #FFD700 0%, transparent 70%);
                    border-radius: 50%;
                    opacity: 0;
                    animation: sparkleRise ${duration}ms ease-out forwards;
                `;

                container.appendChild(sparkle);
            }, 500 + i * 50);
        }
    };

    // 玫瑰金几何图形 (恋爱纪念日)
    const playGoldenShapesEffect = (colors) => {
        const container = createEffectsContainer();
        const shapes = ['◇', '◆', '✧', '❖', '⬡', '♡'];
        const count = 40;

        // 添加胶片颗粒感
        const grain = document.createElement('div');
        grain.style.cssText = `
            position: absolute;
            inset: 0;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E");
            opacity: 0;
            animation: grainFade 2s ease forwards;
            pointer-events: none;
        `;
        container.appendChild(grain);

        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const shape = document.createElement('div');
                const shapeChar = shapes[Math.floor(Math.random() * shapes.length)];
                const size = 16 + Math.random() * 24;
                const x = Math.random() * 100;
                const duration = 4000 + Math.random() * 3000;
                const delay = Math.random() * 800;
                const rotation = Math.random() * 720 - 360;
                const colorIndex = Math.floor(Math.random() * colors.length);

                shape.textContent = shapeChar;
                shape.style.cssText = `
                    position: absolute;
                    left: ${x}%;
                    top: -10%;
                    font-size: ${size}px;
                    color: ${colors[colorIndex]};
                    text-shadow: 0 0 10px ${colors[colorIndex]}80;
                    opacity: 0;
                    transform: rotate(0deg);
                    animation: goldenFall ${duration}ms ${delay}ms ease-out forwards;
                    --rotation: ${rotation}deg;
                `;

                container.appendChild(shape);
            }, i * 60);
        }
    };

    // 霓虹爱心 (情人节)
    const playNeonHeartsEffect = (colors) => {
        const container = createEffectsContainer();

        // 先显示跳动的心形
        const centralHeart = document.createElement('div');
        centralHeart.innerHTML = `
            <svg width="120" height="120" viewBox="0 0 48 48" fill="none">
                <path d="M24 40 C12 32 4 24 4 16 C4 10 8 6 14 6 C18 6 22 9 24 12 C26 9 30 6 34 6 C40 6 44 10 44 16 C44 24 36 32 24 40 Z" 
                      fill="none" stroke="${colors[0]}" stroke-width="2"
                      style="filter: drop-shadow(0 0 10px ${colors[0]}) drop-shadow(0 0 20px ${colors[1]});"/>
            </svg>
        `;
        centralHeart.style.cssText = `
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%) scale(0);
            animation: heartBeat 2s ease forwards;
        `;
        container.appendChild(centralHeart);

        // 2秒后爆发成多个霓虹心
        setTimeout(() => {
            centralHeart.style.animation = 'heartExplode 0.5s ease forwards';

            for (let i = 0; i < 50; i++) {
                setTimeout(() => {
                    const heart = document.createElement('div');
                    const size = 24 + Math.random() * 40;
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 30 + Math.random() * 50;
                    const endX = 50 + Math.cos(angle) * distance;
                    const endY = 50 + Math.sin(angle) * distance;
                    const rotation = Math.random() * 60 - 30;
                    const colorIndex = Math.floor(Math.random() * colors.length);
                    const duration = 2000 + Math.random() * 2000;

                    heart.style.cssText = `
                        position: absolute;
                        width: ${size}px;
                        height: ${size}px;
                        left: 50%;
                        top: 50%;
                        background-image: url('images/effects/neon-heart.svg');
                        background-size: contain;
                        background-repeat: no-repeat;
                        filter: hue-rotate(${colorIndex * 30}deg);
                        transform: translate(-50%, -50%) rotate(${rotation}deg) scale(0);
                        opacity: 0;
                        animation: neonBurst ${duration}ms ease-out forwards;
                        --end-x: ${endX}%;
                        --end-y: ${endY}%;
                    `;

                    container.appendChild(heart);
                }, i * 30);
            }
        }, 2000);
    };

    // ============================================================
    // 方案 B: 沉浸氛围特效
    // ============================================================

    // 玫瑰花瓣雨 (结婚纪念日)
    const playRosePetalsEffect = (colors) => {
        const container = createEffectsContainer();
        container.style.pointerEvents = 'auto'; // 允许交互

        // 调整网站氛围光为暖红色
        const ambientLight = document.querySelector('.ambient-light');
        if (ambientLight) {
            ambientLight.style.transition = 'background 2s ease';
            ambientLight.style.background = `radial-gradient(circle at center, 
                rgba(139, 0, 0, 0.15) 0%, 
                rgba(128, 0, 32, 0.1) 30%, 
                transparent 70%)`;
        }

        let petalsOnScreen = 0;
        const maxPetals = 15;

        const createPetal = () => {
            if (petalsOnScreen >= maxPetals) return;

            const petal = document.createElement('div');
            petal.className = 'effect-petal';
            const size = 30 + Math.random() * 30;
            const x = Math.random() * 100;
            const rotation = Math.random() * 360;
            const duration = 8000 + Math.random() * 4000;
            const swayAmount = 20 + Math.random() * 30;
            const colorIndex = Math.floor(Math.random() * 3);

            petal.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}%;
                top: -10%;
                background-image: url('images/effects/rose-petal.svg');
                background-size: contain;
                background-repeat: no-repeat;
                filter: hue-rotate(${colorIndex * 10}deg);
                transform: rotate(${rotation}deg);
                opacity: 0.85;
                cursor: pointer;
                animation: petalFall ${duration}ms linear forwards;
                --sway: ${swayAmount}px;
                --rotation: ${rotation + 180}deg;
            `;

            // 鼠标交互：吹走花瓣
            petal.addEventListener('mouseenter', () => {
                petal.style.animation = 'petalBlowAway 1s ease-out forwards';
                petalsOnScreen--;
            });

            // 点击彩蛋：显示情话
            petal.addEventListener('click', () => {
                if (Math.random() < 0.3) { // 30% 概率
                    showLoveQuote(petal);
                }
            });

            container.appendChild(petal);
            petalsOnScreen++;

            // 花瓣落地后移除
            setTimeout(() => {
                if (petal.parentNode) {
                    petal.remove();
                    petalsOnScreen--;
                }
            }, duration);
        };

        // 持续生成花瓣
        const petalInterval = setInterval(createPetal, 800);

        // 存储清理函数
        window._anniversaryCleanup = () => {
            clearInterval(petalInterval);
            if (ambientLight) {
                ambientLight.style.background = '';
            }
        };
    };

    // 微型烟花 (新年)
    const playFireworksEffect = (colors) => {
        const container = createEffectsContainer();

        const createFirework = () => {
            const x = 10 + Math.random() * 80;
            const y = 5 + Math.random() * 25; // 屏幕上方 1/3
            const colorIndex = Math.floor(Math.random() * colors.length);
            const particleCount = 20 + Math.floor(Math.random() * 15);

            // 发射轨迹
            const trail = document.createElement('div');
            trail.style.cssText = `
                position: absolute;
                width: 3px;
                height: 3px;
                left: ${x}%;
                bottom: 0;
                background: ${colors[colorIndex]};
                border-radius: 50%;
                box-shadow: 0 0 6px ${colors[colorIndex]};
                animation: fireworkRise 1s ease-out forwards;
                --end-y: ${y}%;
            `;
            container.appendChild(trail);

            // 1秒后爆炸
            setTimeout(() => {
                trail.remove();

                for (let i = 0; i < particleCount; i++) {
                    const particle = document.createElement('div');
                    const angle = (i / particleCount) * Math.PI * 2;
                    const distance = 30 + Math.random() * 50;
                    const size = 2 + Math.random() * 3;

                    particle.style.cssText = `
                        position: absolute;
                        width: ${size}px;
                        height: ${size}px;
                        left: ${x}%;
                        top: ${y}%;
                        background: ${colors[colorIndex]};
                        border-radius: 50%;
                        box-shadow: 0 0 ${size * 2}px ${colors[colorIndex]};
                        animation: fireworkExplode 2s ease-out forwards;
                        --angle: ${angle}rad;
                        --distance: ${distance}px;
                    `;
                    container.appendChild(particle);

                    setTimeout(() => particle.remove(), 2000);
                }
            }, 1000);
        };

        // 每 3-5 秒一朵烟花
        const fireworkInterval = setInterval(() => {
            createFirework();
        }, 3000 + Math.random() * 2000);

        // 立即放一朵
        createFirework();

        window._anniversaryCleanup = () => {
            clearInterval(fireworkInterval);
        };
    };

    // 情话弹出
    const LOVE_QUOTES = [
        '执子之手，与子偕老',
        '愿得一人心，白首不相离',
        '你是我的唯一',
        '余生请多指教',
        '有你，便是晴天',
        '爱你，每一天'
    ];

    const showLoveQuote = (element) => {
        const quote = document.createElement('div');
        quote.textContent = LOVE_QUOTES[Math.floor(Math.random() * LOVE_QUOTES.length)];
        quote.style.cssText = `
            position: fixed;
            left: ${element.getBoundingClientRect().left}px;
            top: ${element.getBoundingClientRect().top - 40}px;
            font-family: 'LXGW WenKai Screen', serif;
            font-size: 14px;
            color: #FFD1DC;
            text-shadow: 0 0 10px rgba(139, 0, 0, 0.5);
            white-space: nowrap;
            pointer-events: none;
            animation: quoteFloat 2s ease-out forwards;
            z-index: 10000;
        `;
        document.body.appendChild(quote);
        setTimeout(() => quote.remove(), 2000);
    };

    // ============================================================
    // 调度器主逻辑
    // ============================================================

    // URL 参数测试钩子（开发用，不影响 5-14 当天的真实触发）
    //   ?d6k=1 / ?d6k=auto      → 强制完整跑 day-6000 叙事
    //   ?d6k=stage1/stage2/stage3 → 跳到指定阶段
    //   ?anniversary=<id>        → 强制触发任意 id 的纪念日
    const checkUrlOverride = () => {
        const params = new URLSearchParams(window.location.search);
        const d6k = params.get('d6k');
        if (d6k) {
            const launch = () => {
                if (!window.Day6000) {
                    console.warn('Anniversary URL override: Day6000 not loaded yet');
                    return;
                }
                if (d6k === '1' || d6k === 'auto' || d6k === 'true') {
                    const cfg = ANNIVERSARIES.find(a => a.id === 'day-6000');
                    window.Day6000.start(cfg);
                } else if (/^stage[123]$/.test(d6k)) {
                    window.Day6000.testStage(Number(d6k.slice(5)));
                }
            };
            // 等 day-6000.js 初始化完成（同一帧内）
            if (window.Day6000) launch();
            else setTimeout(launch, 50);
            return true;
        }

        const force = params.get('anniversary');
        if (force) {
            setTimeout(() => window.AnniversaryEffects?.test(force), 100);
            return true;
        }

        return false;
    };

    const checkAndPlayEffect = () => {
        // URL 测试钩子优先（开发用，不受 prefers-reduced-motion 限制）
        if (checkUrlOverride()) {
            console.log('Anniversary: URL override active, skipping date check.');
            return;
        }

        if (prefersReducedMotion()) {
            console.log('Anniversary: Reduced motion preferred, skipping effects.');
            return;
        }

        const anniversary = findTodayAnniversary();

        if (!anniversary) {
            console.log('Anniversary: No special day today.');
            return;
        }

        console.log(`Anniversary: Today is ${anniversary.name}!`);

        // 方案 C: 沉浸叙事 (Personal Cinema) —— 委托给独立模块
        if (anniversary.type === 'C') {
            const launch = () => {
                if (window.Day6000 && typeof window.Day6000.start === 'function') {
                    window.Day6000.start(anniversary);
                } else {
                    console.warn('Anniversary: type=C requires window.Day6000.start (day-6000.js not loaded).');
                }
            };
            // once 类型本身就只触发一次，不再用 hasShownToday 二次拦截
            // 模块内部自行管理"用户已看过"的状态
            setTimeout(launch, 600);
            return;
        }

        // 方案 A: 只播放一次
        if (anniversary.type === 'A') {
            if (hasShownToday(anniversary.id)) {
                console.log('Anniversary: Already shown today.');
                return;
            }

            markAsShown(anniversary.id);

            // 稍微延迟，等页面加载完
            setTimeout(() => {
                // 显示标题
                if (anniversary.title) {
                    createTextOverlay(anniversary.title, anniversary.colors);
                    removeTextOverlay(4000);
                }

                // 播放特效
                switch (anniversary.effect) {
                    case 'butterfly':
                        playButterflyEffect(anniversary.colors);
                        break;
                    case 'golden-shapes':
                        playGoldenShapesEffect(anniversary.colors);
                        break;
                    case 'neon-hearts':
                        playNeonHeartsEffect(anniversary.colors);
                        break;
                }

                // 5秒后清理
                removeEffectsContainer(6000);
            }, 1000);
        }

        // 方案 B: 持续显示
        if (anniversary.type === 'B') {
            setTimeout(() => {
                // 短暂显示标题 (如果有)
                if (anniversary.title) {
                    createTextOverlay(anniversary.title, anniversary.colors);
                    removeTextOverlay(3000);
                }

                // 启动持续特效
                switch (anniversary.effect) {
                    case 'rose-petals':
                        playRosePetalsEffect(anniversary.colors);
                        break;
                    case 'fireworks':
                        playFireworksEffect(anniversary.colors);
                        break;
                }
            }, 500);
        }
    };

    // ============================================================
    // 初始化
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAndPlayEffect);
    } else {
        checkAndPlayEffect();
    }

    // 暴露测试接口 (开发用)
    window.AnniversaryEffects = {
        test: (id) => {
            const anniversary = ANNIVERSARIES.find(a => a.id === id);
            if (!anniversary) {
                console.warn(`Anniversary: id="${id}" not found. Available:`, ANNIVERSARIES.map(a => a.id));
                return;
            }
            console.log(`Testing: ${anniversary.name}`);

            // 方案 C 走独立模块
            if (anniversary.type === 'C') {
                if (window.Day6000 && typeof window.Day6000.start === 'function') {
                    window.Day6000.start(anniversary);
                } else {
                    console.warn('Anniversary: type=C requires window.Day6000.start (day-6000.js not loaded).');
                }
                return;
            }

            if (anniversary.title) {
                createTextOverlay(anniversary.title, anniversary.colors);
                removeTextOverlay(3000);
            }
            switch (anniversary.effect) {
                case 'butterfly': playButterflyEffect(anniversary.colors); break;
                case 'golden-shapes': playGoldenShapesEffect(anniversary.colors); break;
                case 'neon-hearts': playNeonHeartsEffect(anniversary.colors); break;
                case 'rose-petals': playRosePetalsEffect(anniversary.colors); break;
                case 'fireworks': playFireworksEffect(anniversary.colors); break;
            }
            if (anniversary.type === 'A') removeEffectsContainer(6000);
        },
        list: () => ANNIVERSARIES.map(a => `${a.once || a.date}: ${a.name} (${a.id})`),
        cleanup: () => {
            if (window._anniversaryCleanup) window._anniversaryCleanup();
            effectsContainer?.remove();
            textOverlay?.remove();
            if (window.Day6000 && typeof window.Day6000.cleanup === 'function') {
                window.Day6000.cleanup();
            }
        }
    };

})();
