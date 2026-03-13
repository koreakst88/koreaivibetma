// tma/public/js/day.js

// 1. Основная загрузка
async function loadDayContent() {
    // Получаем ID дня из URL
    const urlParams = new URLSearchParams(window.location.search);
    const dayId = urlParams.get('id');

    // Если id нет (перешли напрямую), возвращаем на главную
    if (!dayId) {
        window.location.href = 'index.html';
        return;
    }

    // Проверка доступа из access.js
    if (typeof isDayLocked === 'function' && isDayLocked(dayId)) {
        showLockedMessage();
        document.getElementById('day-title').textContent = 'Доступ закрыт';
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
        setTimeout(() => trackEvent('day_opened', {
            day_id: dayId,
            day_title: dayTitle,
        }), 1000);
    }

    try {
        // Рендер заглушки
        const container = document.getElementById('day-content');

        // Загрузка markdown
        const response = await fetch(`content/${dayId}.md`);

        // Если файла нет
        if (!response.ok) {
            throw new Error('Урок не найден');
        }

        const markdown = await response.text();

        // Настройка marked.js для добавления id к заголовкам
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
            }
        };
        marked.use({ renderer });

        // Рендерим через marked.js
        const html = marked.parse(markdown);
        container.innerHTML = html;

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

        // Если есть функция обработки чек-листов (progress.js)
        if (typeof processChecklists === 'function') {
            processChecklists(dayId);
        }

        // Навешиваем трекинг на чек-боксы после processChecklists
        _trackChecklistEvents(dayId, dayTitle);

        // Если загрузка успешна, вычисляем кнопки навигации
        setupNavigation(dayId);

        // Отмечаем день как пройденный (если функция доступна)
        if (typeof markDayCompleted === 'function') {
            markDayCompleted(dayId);
        }

        // Событие: день завершён (контент загружен и отмечен как пройденный)
        if (typeof trackEvent === 'function') {
            setTimeout(() => trackEvent('day_completed', {
                day_id: dayId,
                day_title: dayTitle,
            }), 1000);
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
 * Навешивает трекинг событий на чек-боксы дня.
 * Вызывается после processChecklists, чтобы чек-боксы уже были в DOM.
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
                        setTimeout(() => trackEvent('checklist_completed', {
                            day_id: dayId,
                            day_title: dayTitle,
                            checkbox_index: index,
                            completed_count: completed,
                            total_count: total,
                        }), 1000);
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
function setupNavigation(currentDayId) {
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
        const isLocked = typeof isDayLocked === 'function' ? isDayLocked(nextId) : false;

        if (!isLocked) {
            nextBtn.classList.remove('hidden');
            nextBtn.onclick = () => { window.location.href = `day.html?id=${nextId}`; };
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
    container.innerHTML = `
        <div class="text-center py-16 bg-gray-50 rounded-2xl border border-gray-100 mt-4">
            <div class="text-6xl mb-6 transform hover:scale-110 transition-transform">🔒</div>
            <h2 class="text-2xl font-bold text-gray-800 mb-3">Этот день недоступен</h2>
            <p class="text-gray-500 mb-8 max-w-sm mx-auto">Чтобы открыть эти материалы, вам необходимо оформить полный курс или дождаться разблокировки.</p>
            <button onclick="goBack()" class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-8 rounded-xl transition-colors shadow-sm inline-flex items-center">
                <svg class="w-5 h-5 mr-2 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                Вернуться на главную
            </button>
        </div>
    `;

    // Скрываем навигацию снизу, она тут не нужна
    document.querySelector('nav').style.display = 'none';
}

// 5. Инициализация
document.addEventListener('DOMContentLoaded', () => {
    // Вызов функции setupBackButton из telegram.js (чтобы показать стрелочку в тулбаре TG)
    if (typeof setupBackButton === 'function') {
        setupBackButton();
    }

    // Запускаем основной цикл
    loadDayContent();
});
