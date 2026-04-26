// tma/public/js/day.js

// Инициализация аналитики при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    try {
        const tgUser = (typeof Telegram !== 'undefined' && 
            Telegram.WebApp?.initDataUnsafe?.user) || null;
        if (typeof initAnalytics === 'function') {
            initAnalytics(tgUser);
        }
    } catch(e) {}
});

let currentLessonDayId = null;

function trackLessonEvent(name, props = {}) {
    if (typeof trackEvent === 'function') {
        try {
            trackEvent(name, props);
        } catch (error) {
            console.warn(`[Analytics] ${name} error:`, error);
        }
    }
}

function getCompactDayHeaderTitle(dayId) {
    const dayConfig = DAYS_CONFIG?.[dayId];
    const dayOrder = dayConfig?.order;

    if (dayId === 'day-0') {
        return 'Первый урок';
    }

    if (typeof dayOrder === 'number' && dayOrder > 0) {
        return `День ${dayOrder}`;
    }

    return dayConfig?.title || 'Урок';
}

function setDayStatusBadge(text, state = 'default') {
    const badge = document.getElementById('day-status-badge');
    if (!badge) return;

    badge.textContent = text;
    badge.dataset.state = state;
}

function updateChecklistVisualState() {
    const checklistItems = document.querySelectorAll('#day-content li');

    checklistItems.forEach((item) => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (!checkbox) return;

        item.classList.add('checklist-item');
        item.classList.toggle('checked', checkbox.checked);
    });
}

function updateLessonProgressUI() {
    const checkboxes = Array.from(document.querySelectorAll('#day-content input[type="checkbox"]'));
    const progressBar = document.getElementById('lesson-progress-bar');
    const completeBlock = document.getElementById('day-complete-block');

    if (!progressBar) return;

    if (checkboxes.length === 0) {
        progressBar.style.width = '0%';
        if (completeBlock) {
            completeBlock.style.display = 'none';
        }
        setDayStatusBadge('Материал', 'default');
        return;
    }

    const checkedCount = checkboxes.filter((checkbox) => checkbox.checked).length;
    const progressPercent = Math.round((checkedCount / checkboxes.length) * 100);

    progressBar.style.width = `${progressPercent}%`;
    setDayStatusBadge(`${checkedCount}/${checkboxes.length}`, checkedCount === checkboxes.length ? 'complete' : 'progress');

    if (completeBlock) {
        const wasVisible = completeBlock.style.display !== 'none';
        const isComplete = checkedCount === checkboxes.length;

        completeBlock.style.display = isComplete ? '' : 'none';

        if (isComplete && !wasVisible && window.Haptic?.success) {
            window.Haptic.success();
        }

        if (isComplete && !wasVisible && currentLessonDayId && DAYS_CONFIG[currentLessonDayId]) {
            trackLessonEvent('lesson_completed', {
                day_id: currentLessonDayId,
                day_number: DAYS_CONFIG[currentLessonDayId].order
            });
        }
    }
}

function copyLessonText(text, button) {
    const originalText = button.textContent;

    const markCopied = () => {
        button.textContent = 'Скопировано';
        button.classList.add('is-copied');

        if (window.Haptic?.light) {
            window.Haptic.light();
        }

        window.setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('is-copied');
        }, 1800);
    };

    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(markCopied).catch(() => {
            fallbackCopyLessonText(text, markCopied);
        });
        return;
    }

    fallbackCopyLessonText(text, markCopied);
}

function fallbackCopyLessonText(text, onSuccess) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-1000px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
        document.execCommand('copy');
        onSuccess();
    } catch (error) {
        console.warn('Copy failed:', error);
    } finally {
        textarea.remove();
    }
}

function enhanceCodeBlocks(container) {
    container.querySelectorAll('pre').forEach((pre) => {
        if (pre.parentElement?.classList.contains('lesson-code-card')) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'lesson-code-card';

        const header = document.createElement('div');
        header.className = 'lesson-code-card__header';
        header.innerHTML = '<span>Готовый промпт</span>';

        const copyButton = document.createElement('button');
        copyButton.type = 'button';
        copyButton.className = 'lesson-copy-button';
        copyButton.textContent = 'Скопировать';
        copyButton.addEventListener('click', () => {
            copyLessonText(pre.textContent.trim(), copyButton);
        });

        header.appendChild(copyButton);
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(header);
        wrapper.appendChild(pre);
    });
}

function wrapLessonTables(container) {
    container.querySelectorAll('table').forEach((table) => {
        if (table.parentElement?.classList.contains('lesson-table-scroll')) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'lesson-table-scroll';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
    });
}

function wrapFreeLessonSections(container) {
    const headings = Array.from(container.querySelectorAll('h2'));

    headings.forEach((heading, index) => {
        if (heading.closest('.free-lesson-card')) return;

        const card = document.createElement('section');
        const headingText = heading.textContent.trim();
        const isStep = headingText.startsWith('Шаг');
        const isIntro = headingText.includes('Что ты сделаешь');
        const isResult = headingText.includes('Ты только что сделал');
        const isContact = headingText.includes('Покажи мне');
        const isFinalCta = headingText.includes('Хочу научиться');

        card.className = 'free-lesson-card';
        if (isIntro) card.classList.add('free-lesson-card--intro');
        if (isStep) card.classList.add('free-lesson-card--step');
        if (isResult) card.classList.add('free-lesson-card--result');
        if (isContact) card.classList.add('free-lesson-card--contact');
        if (isFinalCta) card.classList.add('free-lesson-card--cta');

        if (isStep) {
            const stepNumber = headingText.match(/Шаг\s+(\d+)/)?.[1];
            if (stepNumber) {
                const badge = document.createElement('span');
                badge.className = 'free-lesson-card__badge';
                badge.textContent = `Шаг ${stepNumber}`;
                card.appendChild(badge);
            }
        }

        heading.parentNode.insertBefore(card, heading);

        let currentNode = heading;
        while (currentNode) {
            const nextNode = currentNode.nextSibling;
            card.appendChild(currentNode);

            if (nextNode?.nodeType === Node.ELEMENT_NODE && nextNode.tagName === 'H2') {
                break;
            }

            currentNode = nextNode;
        }

        card.style.setProperty('--card-index', index);
    });
}

function enhanceFreeLessonContent(container) {
    container.classList.add('lesson-content--free');
    container.closest('.lesson-content-shell')?.classList.add('lesson-content-shell--free');
    wrapFreeLessonSections(container);

    container.querySelectorAll('p').forEach((paragraph) => {
        const text = paragraph.textContent.trim();

        if (paragraph.querySelector('img')) {
            paragraph.classList.add('lesson-result-preview');
        }

        if (text.startsWith('Результат шага:')) {
            paragraph.classList.add('lesson-result-pill');
        }

        if (text === 'Что сделать:') {
            paragraph.classList.add('lesson-action-label');
        }
    });

    container.querySelectorAll('a[href^="https://t.me/"]').forEach((link) => {
        link.classList.add('lesson-telegram-cta');
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
    });
}

function enhanceLessonContent(container, dayId) {
    enhanceCodeBlocks(container);
    wrapLessonTables(container);

    if (dayId === 'day-0') {
        enhanceFreeLessonContent(container);
    }
}

// 1. Основная загрузка
async function loadDayContent() {
    // Получаем ID дня из URL
    const urlParams = new URLSearchParams(window.location.search);
    const dayId = urlParams.get('id');
    const container = document.getElementById('day-content');

    // Если id нет (перешли напрямую), возвращаем на главную
    if (!dayId) {
        window.location.href = 'index.html';
        return;
    }

    if (typeof showLoader === 'function') {
        showLoader('day-content');
    }

    // Проверка доступа из access.js
    if (typeof isDayLocked === 'function' && await isDayLocked(dayId)) {
        if (typeof hideLoader === 'function') {
            hideLoader('day-content');
        }
        showLockedMessage();
        document.getElementById('day-title').textContent = 'Доступ закрыт';
        setDayStatusBadge('Закрыт', 'locked');
        return;
    }

    // Получаем заголовок дня для аналитики
    let dayTitle = `День #${dayId.replace('day', '')}`;
    let headerTitle = getCompactDayHeaderTitle(dayId);

    // Присваиваем заголовок из конфигурации
    if (typeof DAYS_CONFIG !== 'undefined' && DAYS_CONFIG[dayId]) {
        dayTitle = DAYS_CONFIG[dayId].title;
        headerTitle = getCompactDayHeaderTitle(dayId);
    }

    document.getElementById('day-title').textContent = headerTitle;

    currentLessonDayId = dayId;
    trackLessonEvent('lesson_started', {
        day_id: dayId,
        day_number: DAYS_CONFIG[dayId]?.order ?? null
    });

    try {
        // Загрузка markdown
        const response = await fetch(`content/${dayId}.md`);

        // Если файла нет
        if (!response.ok) {
            throw new Error('Урок не найден');
        }

        const markdown = await response.text();

        // Настройка marked.js для добавления id к заголовкам и чекбоксов без disabled
        const renderer = {
            heading(token) {
                const text = typeof token === 'object' ? token.text : arguments[0];
                const depth = typeof token === 'object' ? token.depth : arguments[1];

                // Очищаем текст от HTML-тегов перед созданием id
                const plainText = text.replace(/<[^>]+>/g, '');
                const id = plainText.toLowerCase()
                    .replace(/[^\wа-яА-ЯёЁa-zA-Z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '');

                return `<h${depth} id="${id}">${text}</h${depth}>`;
            },
            // Рендерим task list чекбоксы без атрибута disabled
            checkbox(token) {
                const checked = token.checked ? 'checked' : '';
                return `<input type="checkbox" ${checked}>`;
            }
        };
        marked.use({ 
            renderer,
            gfm: true  // Включаем GitHub-стиль Markdown (task lists)
        });

        // Рендерим через marked.js
        const html = marked.parse(markdown);
        container.innerHTML = html;
        enhanceLessonContent(container, dayId);
        if (typeof hideLoader === 'function') {
            hideLoader('day-content');
        }
        setDayStatusBadge('Урок', 'default');

        // Инициализируем чек-листы после рендеринга Markdown
        await initChecklists(dayId);

        // Плавная прокрутка для якорных ссылок (Оглавление) специально для Telegram WebApp
        const anchorLinks = container.querySelectorAll('a[href^="#"]');
        anchorLinks.forEach(link => {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                let targetId = this.getAttribute('href').substring(1);

                // Ищем элемент (с учетом возможного URL encoding)
                let targetElement = document.getElementById(targetId) || document.getElementById(decodeURIComponent(targetId));

                if (targetElement) {
                    const headerOffset = 85; // отступ под липкую шапку
                    const elementPosition = targetElement.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });

        // Если загрузка успешна, вычисляем кнопки навигации
        await setupNavigation(dayId);

        // Отмечаем день как пройденный (если функция доступна)
        if (typeof markDayCompleted === 'function') {
            await markDayCompleted(dayId);
        }

        if (window.Haptic?.light) {
            window.Haptic.light();
        }

    } catch (err) {
        console.error('Ошибка загрузки контента:', err);
        if (typeof renderErrorState === 'function') {
            renderErrorState('day-content', {
                text: 'Не удалось загрузить данные',
                buttonText: 'Попробовать снова',
                buttonId: 'retry-day-content',
                inline: true
            });
            document.getElementById('retry-day-content')?.addEventListener('click', () => {
                loadDayContent();
            });
        }
        if (window.Haptic?.error) {
            window.Haptic.error();
        }
    }
}

/**
 * Функция для инициализации чек-листов после рендеринга Markdown
 * @param {string} dayId
 */
async function initChecklists(dayId) {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const dayProgress = typeof getDayProgress === 'function'
        ? await getDayProgress(dayId)
        : null;
    const savedProgress = Array.isArray(dayProgress?.checklists)
        ? dayProgress.checklists
        : [];

    checkboxes.forEach((cb, index) => {
        // Восстанавливаем состояние чек-листа из progress.js / Supabase
        if (savedProgress[index] === true) {
            cb.checked = true;
        }

        // Делаем чекбокс кликабельным (снимаем disabled если был)
        cb.disabled = false;

        // Слушаем клики
        cb.addEventListener('change', async () => {
            if (typeof updateChecklist === 'function') {
                await updateChecklist(dayId, index, cb.checked);
            }

            updateChecklistVisualState();
            updateLessonProgressUI();

            const allCheckboxes = Array.from(document.querySelectorAll('#day-content input[type="checkbox"]'));
            const checkedCount = allCheckboxes.filter((checkbox) => checkbox.checked).length;

            trackLessonEvent('checklist_item_checked', {
                day_id: dayId,
                item_index: index,
                checked: cb.checked,
                total_checked: checkedCount,
                total_items: allCheckboxes.length
            });

            if (window.Haptic?.light) {
                window.Haptic.light();
            }
        });
    });

    updateChecklistVisualState();
    updateLessonProgressUI();
}

// 2. Навигация внизу страницы
async function setupNavigation(currentDayId) {
    if (typeof DAYS_CONFIG === 'undefined') return;

    // Преобразуем объект в массив ключей, отсортированный по order
    const daysArray = Object.entries(DAYS_CONFIG)
        .sort((a, b) => a[1].order - b[1].order)
        .map(entry => entry[0]);

    const currentIndex = daysArray.indexOf(currentDayId);

    const prevBtn = document.getElementById('prev-day');
    const nextBtn = document.getElementById('next-day');

    // Если есть предыдущий день
    if (currentIndex > 0) {
        const prevId = daysArray[currentIndex - 1];
        prevBtn.classList.remove('hidden');
        prevBtn.onclick = () => { window.location.href = `day.html?id=${prevId}`; };
    } else {
        prevBtn.classList.add('hidden');
    }

    // Если есть следующий день
    if (currentIndex < daysArray.length - 1) {
        const nextId = daysArray[currentIndex + 1];

        // Для следующего дня нужно проверить, не заблокирован ли он
        const isLocked = typeof isDayLocked === 'function' ? await isDayLocked(nextId) : false;

        if (!isLocked) {
            nextBtn.classList.remove('hidden');
            nextBtn.onclick = () => {
                if (window.Haptic?.medium) {
                    window.Haptic.medium();
                }

                window.location.href = `day.html?id=${nextId}`;
            };
        } else {
            // Если заблокирован, скрываем кнопку
            nextBtn.classList.add('hidden');
        }
    } else {
        nextBtn.classList.add('hidden');
    }
}

// 3. Возврат на главную
function goBack() {
    window.location.href = 'index.html';
}

// 4. Окно, если день недоступен (поделили ссылкой напрямую)
function showLockedMessage() {
    const container = document.getElementById('day-content');
    const contentShell = document.querySelector('.lesson-content-shell');
    const lockedBlock = document.getElementById('day-locked-block');
    const completeBlock = document.getElementById('day-complete-block');
    const footer = document.querySelector('.lesson-footer');

    container.innerHTML = '';

    if (contentShell) {
        contentShell.style.display = 'none';
    }

    if (completeBlock) {
        completeBlock.style.display = 'none';
    }

    if (lockedBlock) {
        lockedBlock.style.display = '';
    }

    if (footer) {
        footer.style.display = 'none';
    }
}

// 5. Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    const tgUser = (typeof Telegram !== 'undefined' &&
        Telegram.WebApp?.initDataUnsafe?.user) || null;

    window.currentTelegramUser = tgUser;
    window.currentTelegramUserId = tgUser?.id || null;

    // Вызов функции setupBackButton из telegram.js (чтобы показать стрелочку в тулбаре TG)
    if (typeof setupBackButton === 'function') {
        setupBackButton(() => {
            goBack();
        });
    }

    if (window.supabaseStore?.initUser && tgUser) {
        await window.supabaseStore.initUser(tgUser);
    }

    // Запускаем основной цикл
    await loadDayContent();
});
