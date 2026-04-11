// tma/public/js/app.js

const COURSE_DAY_TITLES = {
    'day-1': 'Основы Vibe Coding',
    'day-2': 'Как устроены приложения Telegram',
    'day-3': 'Формы и взаимодействие',
    'day-4': 'Интеграция с Telegram',
    'day-5': 'Платежи и подключение API',
    'day-6': 'Автоматизация процессов',
    'day-7': 'Аналитика и запуск проекта'
};

let guidesInitialized = false;

// 1. Функция renderDays()
async function renderDays() {
    const container = document.getElementById('days-container');
    if (!container) return;
    container.innerHTML = ''; // Очищаем контейнер перед рендерингом

    // Получаем прогресс, если функция доступна
    const progress = typeof getProgress === 'function' ? await getProgress() : {};

    await Promise.all(
        Object.entries(DAYS_CONFIG)
            .filter(([dayId]) => dayId !== 'day-0')
            .map(async ([dayId, dayInfo]) => {
                const accessStatus = await getDayAccessStatus(dayId);
                const isCompleted = progress[dayId]?.completed || false;
                const displayTitle = COURSE_DAY_TITLES[dayId] || dayInfo.title;
                const statusIcon = accessStatus.locked ? '🔒' : (isCompleted ? '✅' : '→');

                const card = document.createElement('div');
                card.className = `day-card${accessStatus.locked ? ' locked' : ''}${isCompleted ? ' completed' : ''}`;
                card.innerHTML = `
                    <div class="day-card__number">${dayInfo.order}</div>
                    <div class="day-card__content">
                        <div class="day-card__title">День ${dayInfo.order}: ${displayTitle}</div>
                        <div class="day-card__duration">${dayInfo.duration || ''}</div>
                    </div>
                    <div class="day-card__status">${statusIcon}</div>
                `;

                if (!accessStatus.locked) {
                    card.setAttribute('role', 'link');
                    card.setAttribute('tabindex', '0');
                    card.addEventListener('click', () => {
                        window.location.href = `day.html?id=${dayId}`;
                    });
                    card.addEventListener('keydown', (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            window.location.href = `day.html?id=${dayId}`;
                        }
                    });
                }

                container.appendChild(card);
            })
    );

    // Обновляем прогресс-бар, если функция подключена
    if (typeof updateProgressBar === 'function') {
        await updateProgressBar();
    }
}

// 2. Функция showEnrollmentInfo()
function showEnrollmentInfo() {
    // Если уже есть модалка, удаляем
    let existingModal = document.querySelector('.modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    // Tailwind классы для оверлея и центрирования
    modal.className = 'modal fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center tracking-wide z-[100] opacity-0 transition-opacity duration-300 px-4';
    
    modal.innerHTML = `
        <div class="modal-content bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl transform scale-95 transition-transform duration-300 max-h-[90vh] overflow-y-auto">
            <div class="text-center mb-5">
                <div class="text-4xl mb-3">📚</div>
                <h2 class="text-2xl font-bold text-gray-800">Полный курс для учеников</h2>
                <p class="text-gray-500 mt-2 text-sm">Дни 1-7 доступны после записи на курс.</p>
            </div>
            
            <div class="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-100">
                <h3 class="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wider">Что входит в полный курс:</h3>
                <ul class="text-gray-700 space-y-2 text-sm">
                    <li class="flex items-start"><span class="text-blue-500 mr-2">✓</span>7 индивидуальных встреч (60-90 минут)</li>
                    <li class="flex items-start"><span class="text-blue-500 mr-2">✓</span>Доступ ко всем материалам навсегда</li>
                    <li class="flex items-start"><span class="text-blue-500 mr-2">✓</span>Создание полноценного Telegram Mini App</li>
                    <li class="flex items-start"><span class="text-blue-500 mr-2">✓</span>Поддержка преподавателя</li>
                </ul>
            </div>
            
            <div class="modal-actions flex flex-col sm:flex-row gap-3">
                <button onclick="contactTeacher()" class="btn-primary flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors shadow-sm">
                    Записаться
                </button>
                <button onclick="closeModal()" class="btn-secondary flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-colors">
                    Закрыть
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Анимация появления
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('.modal-content').classList.remove('scale-95');
    }, 10);
    
    // Закрытие при клике на фон (опционально для удобства)
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

// 3. Функция closeModal()
function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.classList.add('opacity-0');
        const content = modal.querySelector('.modal-content');
        if (content) content.classList.add('scale-95');
        
        // Ждем окончания анимации
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// 4. Функция showToast(message)
function showToast(message) {
    const toast = document.createElement('div');
    // Tailwind классы для тоста
    toast.className = 'toast fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-5 py-3 rounded-lg shadow-xl opacity-0 transition-opacity duration-300 z-[200] text-sm font-medium flex items-center max-w-[90vw] text-center';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Показываем
    setTimeout(() => {
        toast.classList.remove('opacity-0');
    }, 50);
    
    // Скрываем через 3 секунды
    setTimeout(() => {
        toast.classList.add('opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 5. Функция promptUnlockCode(dayId)
async function promptUnlockCode(dayId) {
    const code = prompt('Введите код из сообщения преподавателя:');
    if (code) {
        // Мы предполагаем, что unlockDay возвращает объект вида { success: true|false, message: "..." }
        const result = typeof unlockDay === 'function' ? unlockDay(code) : { success: false, message: 'Возникла ошибка модуля доступа.' };
        
        if (result && result.success) {
            showToast(`✅ ${result.message}`);
            await renderDays(); // Перерисовать список
        } else {
            // Добавляем вибрацию при ошибке, если Telegram SDK подключен
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
            }
            showToast(`❌ ${result ? result.message : 'Неверный код'}`);
        }
    }
}

// 6. Заполнение данных пользователя в хедере и профиле
function initializeUserProfile() {
    const tgUser = (typeof Telegram !== 'undefined' &&
        Telegram.WebApp?.initDataUnsafe?.user) || null;

    const displayName = tgUser?.first_name?.trim() || 'друг';
    const initialSource = tgUser?.first_name || tgUser?.username || 'В';
    const initial = initialSource.charAt(0).toUpperCase();
    const avatarUrl = tgUser?.photo_url || '';

    const userName = document.getElementById('user-name');
    if (userName) {
        userName.textContent = displayName;
    }

    document.querySelectorAll('.user-avatar-shell').forEach(shell => {
        const image = shell.querySelector('.user-avatar-image');
        const fallback = shell.querySelector('.user-avatar-fallback');

        if (fallback) {
            fallback.textContent = initial;
        }

        if (image) {
            if (avatarUrl) {
                image.setAttribute('src', avatarUrl);
            } else {
                image.removeAttribute('src');
            }
        }
    });
}

// 7. Переключение экранов через нижний таббар
function showAppSection(sectionId, activeTabId) {
    const sectionIds = ['home-section', 'about-section', 'quiz-section', 'course-section', 'guides-section', 'profile-section'];
    const hiddenChromeSections = ['about-section', 'quiz-section'];
    const isChromeHidden = hiddenChromeSections.includes(sectionId);
    const tabBar = document.querySelector('.tab-bar');
    const appHeader = document.querySelector('.app-header');

    sectionIds.forEach(id => {
        const section = document.getElementById(id);
        if (!section) return;

        section.style.display = id === sectionId ? '' : 'none';
    });

    document.querySelectorAll('.tab-bar__item').forEach(tab => {
        tab.classList.toggle('is-active', tab.id === activeTabId);
    });

    if (tabBar) {
        tabBar.style.display = isChromeHidden ? 'none' : '';
    }

    if (appHeader) {
        appHeader.style.display = isChromeHidden ? 'none' : '';
    }

    document.body.classList.toggle('about-open', sectionId === 'about-section');
    document.body.classList.toggle('quiz-open', sectionId === 'quiz-section');

    if (sectionId === 'quiz-section' && window.quizApp?.openQuiz) {
        window.quizApp.openQuiz();
    }

    if (sectionId === 'guides-section') {
        if (!guidesInitialized && typeof initGuides === 'function') {
            initGuides()
                .then(() => {
                    guidesInitialized = true;
                })
                .catch((error) => {
                    console.error('Ошибка инициализации гайдов:', error);
                });
        }

        if (typeof trackEvent === 'function') {
            try {
                trackEvent('guides_viewed');
            } catch (error) {
                console.warn('[Analytics] Ошибка трекинга guides_viewed:', error);
            }
        }
    }

    if (sectionId === 'profile-section' && typeof initProfile === 'function') {
        initProfile();
    }

    if (typeof setupBackButton === 'function' && isChromeHidden) {
        setupBackButton(() => {
            showAppSection('home-section', 'tab-home');
        });
    } else if (typeof clearTelegramBackButton === 'function') {
        clearTelegramBackButton();
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
}

function setupTabNavigation() {
    const tabBindings = [
        ['tab-home', 'home-section'],
        ['tab-course', 'course-section'],
        ['tab-guides', 'guides-section'],
        ['tab-profile', 'profile-section']
    ];

    tabBindings.forEach(([tabId, sectionId]) => {
        const tab = document.getElementById(tabId);
        if (!tab) return;

        tab.addEventListener('click', (event) => {
            event.preventDefault();
            showAppSection(sectionId, tabId);
        });
    });

    const quickActions = [
        ['btn-about', 'about-section', null],
        ['card-quiz', 'quiz-section', null],
        ['card-continue', 'course-section', 'tab-course'],
        ['profile-progress-link', 'course-section', 'tab-course']
    ];

    quickActions.forEach(([triggerId, sectionId, tabId]) => {
        const trigger = document.getElementById(triggerId);
        if (!trigger) return;

        trigger.addEventListener('click', (event) => {
            event.preventDefault();
            showAppSection(sectionId, tabId);
        });
    });

    const aboutBack = document.getElementById('about-back');
    if (aboutBack) {
        aboutBack.addEventListener('click', () => {
            showAppSection('home-section', 'tab-home');
        });
    }

    showAppSection('home-section', 'tab-home');
}

// 8. Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    // Предотвращаем сворачивание при скроллинге
    if (window.Telegram && window.Telegram.WebApp) {
        const tgApp = window.Telegram.WebApp;
        // Разворачиваем на весь экран
        tgApp.expand();
        // Отключаем вертикальные свайпы (Bot API 7.7+)
        if (typeof tgApp.disableVerticalSwipes === 'function') {
            tgApp.disableVerticalSwipes();
        }
        // Запрашиваем полноэкранный режим — НЕ используем, перекрывает UI Telegram
    }

    // Инициализация аналитики
    try {
        const tgUser = (typeof Telegram !== 'undefined' && 
            Telegram.WebApp?.initDataUnsafe?.user) || null;

        window.currentTelegramUser = tgUser;
        window.currentTelegramUserId = tgUser?.id || null;
        
        if (typeof initAnalytics === 'function') {
            initAnalytics(tgUser);
        }

        if (window.supabaseStore?.initUser && tgUser) {
            await window.supabaseStore.initUser(tgUser);
        }

        if (window.supabaseStore?.getUserAccess && window.currentTelegramUserId) {
            window.userAccess = await window.supabaseStore.getUserAccess(window.currentTelegramUserId);
        }

        if (window.supabaseStore?.getProgress && window.currentTelegramUserId) {
            window.userProgress = await window.supabaseStore.getProgress(window.currentTelegramUserId);
        }
    } catch(e) {}

    initializeUserProfile();
    setupTabNavigation();

    // В случае если DAYS_CONFIG загрузился до app.js
    if (typeof DAYS_CONFIG !== 'undefined') {
        await renderDays();
    } else {
        console.warn('Внимание: DAYS_CONFIG не определен. Убедитесь, что access.js подключен до app.js в HTML файле.');
    }
});
