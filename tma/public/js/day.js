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

        if (isComplete && !wasVisible && window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
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

    // Проверка доступа из access.js
    if (typeof isDayLocked === 'function' && await isDayLocked(dayId)) {
        showLockedMessage();
        document.getElementById('day-title').textContent = 'Доступ закрыт';
        setDayStatusBadge('Закрыт', 'locked');
        return;
    }

    // Получаем заголовок дня для аналитики
    let dayTitle = `День #${dayId.replace('day', '')}`;

    // Присваиваем заголовок из конфигурации
    if (typeof DAYS_CONFIG !== 'undefined' && DAYS_CONFIG[dayId]) {
        dayTitle = DAYS_CONFIG[dayId].title;
        document.getElementById('day-title').textContent = dayTitle;
    } else {
        document.getElementById('day-title').textContent = dayTitle;
    }

    // Событие: пользователь открыл день
    if (typeof trackEvent === 'function') {
        setTimeout(() => {
            trackEvent('day_opened', {
                day_id: dayId,
                day_title: dayTitle,
            });
        }, 1000);
    }

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

        // Навешиваем трекинг на чек-боксы после initChecklists
        _trackChecklistEvents(dayId, dayTitle);

        // Если загрузка успешна, вычисляем кнопки навигации
        await setupNavigation(dayId);

        // Отмечаем день как пройденный (если функция доступна)
        if (typeof markDayCompleted === 'function') {
            await markDayCompleted(dayId);
        }

        // Событие: день завершён (контент загружен и отмечен как пройденный)
        if (typeof trackEvent === 'function') {
            setTimeout(() => {
                trackEvent('day_completed', {
                    day_id: dayId,
                    day_title: dayTitle,
                });
            }, 1000);
        }

        // Посылаем легкую вибрацию
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }

    } catch (err) {
        console.error('Ошибка загрузки контента:', err);
        container.innerHTML = `
            <div class="text-center py-10">
                <div class="text-4xl mb-4 text-red-400">⚠️</div>
                <h2 class="text-xl font-bold text-gray-800 mb-2">Ошибка загрузки файла</h2>
                <p class="text-gray-500 mb-6">Не удалось загрузить материалы для этого дня. Убедитесь, что файл content/${dayId}.md существует.</p>
                <button onclick="goBack()" class="bg-gray-200 text-gray-800 font-semibold px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors">
                    Назад
                </button>
            </div>
        `;
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

            // Легкая вибрация в Telegram при клике
            if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
            }
        });
    });

    updateChecklistVisualState();
    updateLessonProgressUI();
}

/**
 * Навешивает трекинг событий на чек-боксы дня.
 * Вызывается после initChecklists, чтобы чек-боксы уже были в DOM.
 * @param {string} dayId
 * @param {string} dayTitle
 */
function _trackChecklistEvents(dayId, dayTitle) {
    try {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        if (checkboxes.length === 0) return;

        checkboxes.forEach((checkbox, index) => {
            checkbox.addEventListener('change', function () {
                if (!this.checked) return; // трекаем только отметку (не снятие)

                try {
                    // Считаем, сколько чек-боксов отмечено
                    const total = checkboxes.length;
                    const completed = Array.from(checkboxes).filter(cb => cb.checked).length;

                    // Событие: отмечен один чек-бокс
                    if (typeof trackEvent === 'function') {
                        setTimeout(() => {
                            trackEvent('checklist_completed', {
                                day_id: dayId,
                                day_title: dayTitle,
                                checkbox_index: index,
                                completed_count: completed,
                                total_count: total,
                            });
                        }, 1000);
                    }
                } catch (err) {
                    console.warn('[Analytics] Ошибка трекинга чек-листа:', err);
                }
            });
        });
    } catch (err) {
        console.warn('[Analytics] _trackChecklistEvents ошибка:', err);
    }
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
                if (window.Telegram?.WebApp?.HapticFeedback) {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
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
