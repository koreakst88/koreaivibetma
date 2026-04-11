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

async function renderDays() {
    const container = document.getElementById('days-container');
    if (!container) return;
    if (typeof showLoader === 'function') {
        showLoader('days-container');
    }

    try {
        const progress = typeof getProgress === 'function' ? await getProgress() : {};
        const dayEntries = Object.entries(DAYS_CONFIG).filter(([dayId]) => dayId !== 'day-0');

        if (dayEntries.length === 0) {
            if (typeof renderEmptyState === 'function') {
                renderEmptyState('days-container', {
                    icon: '📚',
                    title: 'Дни курса загружаются...',
                    subtitle: 'Список уроков появится здесь чуть позже.'
                });
            }
            return;
        }

        container.innerHTML = '';

        const dayCards = await Promise.all(
            dayEntries.map(async ([dayId, dayInfo]) => {
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

                return card;
            })
        );

        dayCards.forEach((card) => {
            container.appendChild(card);
        });

        if (typeof updateProgressBar === 'function') {
            await updateProgressBar();
        }
    } catch (error) {
        console.error('Ошибка рендера дней:', error);
        if (typeof renderErrorState === 'function') {
            renderErrorState('days-container', {
                text: 'Не удалось загрузить данные',
                buttonText: 'Попробовать снова',
                buttonId: 'retry-days-load'
            });
            document.getElementById('retry-days-load')?.addEventListener('click', () => {
                renderDays();
            });
        }
    } finally {
        if (typeof hideLoader === 'function') {
            hideLoader('days-container');
        }
    }
}

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
            if (window.Haptic?.selection) {
                window.Haptic.selection();
            }
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

document.addEventListener('DOMContentLoaded', async () => {
    if (window.Telegram && window.Telegram.WebApp) {
        const tgApp = window.Telegram.WebApp;
        tgApp.expand();
        if (typeof tgApp.disableVerticalSwipes === 'function') {
            tgApp.disableVerticalSwipes();
        }
    }

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

    if (typeof DAYS_CONFIG !== 'undefined') {
        await renderDays();
    } else {
        console.warn('Внимание: DAYS_CONFIG не определен. Убедитесь, что access.js подключен до app.js в HTML файле.');
    }
});
