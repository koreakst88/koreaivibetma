// tma/public/js/guides.js

(function () {
    const PROMPT_FILTERS = ['Все', 'Создание', 'Функционал', 'Дизайн', 'Интеграция', 'Аналитика'];
    const CHEATSHEET_TABS = [
        { key: 'terminal', label: 'Terminal' },
        { key: 'git', label: 'Git' },
        { key: 'vscode', label: 'VS Code' },
        { key: 'links', label: 'Links' },
        { key: 'troubleshooting', label: 'Troubleshooting' }
    ];

    const GUIDE_LINKS = [
        {
            group: 'Инструменты',
            items: [
                { name: 'Cursor IDE', description: 'Редактор для быстрой vibe-разработки', url: 'https://cursor.sh', icon: '⌘' },
                { name: 'Vercel', description: 'Быстрый деплой статики и frontend-проектов', url: 'https://vercel.com', icon: '▲' },
                { name: 'Supabase', description: 'База данных, auth и storage в одном месте', url: 'https://supabase.com', icon: '◫' },
                { name: 'Railway', description: 'Простой хостинг для backend и сервисов', url: 'https://railway.app', icon: '◈' },
                { name: 'Telegram BotFather', description: 'Создание ботов и настройка Mini App', url: 'https://t.me/BotFather', icon: '✈' }
            ]
        },
        {
            group: 'Документация',
            items: [
                { name: 'Telegram Mini Apps', description: 'Официальная документация Telegram Web Apps', url: 'https://core.telegram.org/bots/webapps', icon: '📘' },
                { name: 'Grammy Framework', description: 'Фреймворк для Telegram-ботов на Node.js', url: 'https://grammy.dev', icon: '⚙' },
                { name: 'Tailwind CSS', description: 'Утилитарный CSS-фреймворк для быстрых интерфейсов', url: 'https://tailwindcss.com', icon: '🎨' }
            ]
        },
        {
            group: 'Сообщества',
            items: [
                { name: 'KoreDigital Telegram', description: 'Канал и сообщество с кейсами и обновлениями', url: 'https://t.me/koredigital88', icon: '💬' }
            ]
        }
    ];

    let promptsData = [];
    let cheatsheetsData = {};
    let activeGuideTab = 'prompts';
    let activePromptCategory = 'Все';
    let activeCheatsheetCategory = 'terminal';
    let guidesBootstrapped = false;

    function vibrateLight() {
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
    }

    function safeTrack(eventName, props) {
        if (typeof trackEvent === 'function') {
            try {
                trackEvent(eventName, props || {});
            } catch (error) {
                console.warn('[Analytics] guides error:', error);
            }
        }
    }

    function openGuideLink(url) {
        if (window.Telegram?.WebApp?.openLink) {
            window.Telegram.WebApp.openLink(url);
        } else {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    }

    async function copyToClipboard(text, meta = {}) {
        try {
            await navigator.clipboard.writeText(text);
            vibrateLight();

            if (meta.type === 'prompt') {
                safeTrack('prompt_copied', { id: meta.id, category: meta.category });
            }

            return true;
        } catch (error) {
            console.error('Copy failed:', error);
            return false;
        }
    }

    function renderPromptFilters() {
        const container = document.getElementById('prompt-filters');
        if (!container) return;

        container.innerHTML = '';

        PROMPT_FILTERS.forEach((category) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `guide-tab${activePromptCategory === category ? ' active' : ''}`;
            button.textContent = category;
            button.addEventListener('click', () => {
                filterPrompts(category);
            });
            container.appendChild(button);
        });
    }

    function renderPrompts() {
        const container = document.getElementById('guides-prompts-list');
        if (!container) return;

        const filteredPrompts = activePromptCategory === 'Все'
            ? promptsData
            : promptsData.filter((item) => item.category === activePromptCategory);

        container.innerHTML = '';

        if (filteredPrompts.length === 0) {
            container.innerHTML = '<div class="card text-secondary">Промпты для этой категории пока не найдены.</div>';
            return;
        }

        filteredPrompts.forEach((item) => {
            const card = document.createElement('article');
            card.className = 'prompt-card card';
            card.innerHTML = `
                <div class="prompt-card__top">
                    <div class="prompt-card__meta">
                        <h3>${item.title}</h3>
                    </div>
                </div>
                <div class="prompt-card__actions">
                    <span class="prompt-category-badge">${item.category}</span>
                    <button class="copy-btn" type="button">Копировать</button>
                </div>
                <button class="prompt-card__toggle" type="button" aria-expanded="false">
                    <span>Показать промпт</span>
                    <span class="prompt-card__chevron">↓</span>
                </button>
                <div class="prompt-card__body" style="display:none">
                    <pre>${item.prompt}</pre>
                </div>
            `;

            const copyButton = card.querySelector('.copy-btn');
            const toggleButton = card.querySelector('.prompt-card__toggle');
            const body = card.querySelector('.prompt-card__body');

            toggleButton.addEventListener('click', () => {
                const isOpen = toggleButton.getAttribute('aria-expanded') === 'true';
                toggleButton.setAttribute('aria-expanded', String(!isOpen));
                toggleButton.querySelector('span').textContent = isOpen ? 'Показать промпт' : 'Скрыть промпт';
                body.style.display = isOpen ? 'none' : '';
                card.classList.toggle('prompt-card--expanded', !isOpen);
            });

            copyButton.addEventListener('click', async (event) => {
                event.stopPropagation();
                const copied = await copyToClipboard(item.prompt, {
                    type: 'prompt',
                    id: item.id,
                    category: item.category
                });

                if (copied) {
                    copyButton.classList.add('copied');
                    copyButton.textContent = 'Скопировано ✓';
                    setTimeout(() => {
                        copyButton.classList.remove('copied');
                        copyButton.textContent = 'Копировать';
                    }, 2000);
                }
            });

            container.appendChild(card);
        });
    }

    function filterPrompts(category) {
        activePromptCategory = category;
        renderPromptFilters();
        renderPrompts();
    }

    function renderCheatsheetFilters() {
        const container = document.getElementById('cheatsheet-filters');
        if (!container) return;

        container.innerHTML = '';

        CHEATSHEET_TABS.forEach((item) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `guide-tab${activeCheatsheetCategory === item.key ? ' active' : ''}`;
            button.textContent = item.label;
            button.addEventListener('click', () => {
                activeCheatsheetCategory = item.key;
                renderCheatsheetFilters();
                renderCheatsheets();
            });
            container.appendChild(button);
        });
    }

    function renderCheatsheets() {
        const container = document.getElementById('guides-cheatsheets-list');
        if (!container) return;

        const section = cheatsheetsData[activeCheatsheetCategory];
        container.innerHTML = '';

        if (!section?.items?.length) {
            container.innerHTML = '<div class="card text-secondary">Раздел пока пуст.</div>';
            return;
        }

        const table = document.createElement('div');
        table.className = 'cheatsheet-table card';

        section.items.forEach((item) => {
            const row = document.createElement('div');
            row.className = 'cheatsheet-row';
            row.innerHTML = `
                <div class="cheatsheet-row__content">
                    <code>${item.command}</code>
                    <p>${item.description}</p>
                </div>
                <button class="copy-btn" type="button">Копировать</button>
            `;

            const copyButton = row.querySelector('.copy-btn');
            copyButton.addEventListener('click', async () => {
                const textToCopy = item.example || item.command;
                const copied = await copyToClipboard(textToCopy);

                if (copied) {
                    copyButton.classList.add('copied');
                    copyButton.textContent = 'Скопировано ✓';
                    setTimeout(() => {
                        copyButton.classList.remove('copied');
                        copyButton.textContent = 'Копировать';
                    }, 2000);
                }
            });

            table.appendChild(row);
        });

        container.appendChild(table);
    }

    function renderLinks() {
        const container = document.getElementById('guides-links-list');
        if (!container) return;

        container.innerHTML = '';

        GUIDE_LINKS.forEach((group) => {
            const groupBlock = document.createElement('section');
            groupBlock.className = 'guides-links-group';
            groupBlock.innerHTML = `<h3>${group.group}</h3>`;

            group.items.forEach((item) => {
                const card = document.createElement('button');
                card.type = 'button';
                card.className = 'links-card card';
                card.innerHTML = `
                    <div class="links-card__icon">${item.icon}</div>
                    <div class="links-card__content">
                        <h4>${item.name}</h4>
                        <p>${item.description}</p>
                    </div>
                `;
                card.addEventListener('click', () => {
                    vibrateLight();
                    openGuideLink(item.url);
                });
                groupBlock.appendChild(card);
            });

            container.appendChild(groupBlock);
        });
    }

    function switchGuideTab(tab) {
        activeGuideTab = tab;

        document.querySelectorAll('.guides-panel').forEach((panel) => {
            panel.style.display = panel.id === `guides-panel-${tab}` ? '' : 'none';
        });

        document.querySelectorAll('#guides-section > .guides-tabs .guide-tab').forEach((button) => {
            button.classList.toggle('active', button.dataset.tab === tab);
        });
    }

    async function loadGuidesData() {
        const [promptsResponse, cheatsheetsResponse] = await Promise.all([
            fetch('data/prompts.json'),
            fetch('data/cheatsheets.json')
        ]);

        promptsData = await promptsResponse.json();
        cheatsheetsData = await cheatsheetsResponse.json();
    }

    function bindGuideTabs() {
        document.querySelectorAll('#guides-section > .guides-tabs .guide-tab').forEach((button) => {
            button.addEventListener('click', () => {
                switchGuideTab(button.dataset.tab);
            });
        });
    }

    async function initGuides() {
        if (guidesBootstrapped) {
            return;
        }

        await loadGuidesData();
        bindGuideTabs();
        renderPromptFilters();
        renderPrompts();
        renderCheatsheetFilters();
        renderCheatsheets();
        renderLinks();
        switchGuideTab('prompts');
        guidesBootstrapped = true;
    }

    window.guidesApp = {
        initGuides,
        switchGuideTab,
        filterPrompts,
        copyToClipboard
    };

    window.initGuides = initGuides;
    window.switchGuideTab = switchGuideTab;
    window.filterPrompts = filterPrompts;
})();
