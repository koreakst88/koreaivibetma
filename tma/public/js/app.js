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

const APP_SECTION_HEADERS = {
    'home-section': { title: 'greeting', compact: false, showAvatar: true },
    'course-section': { title: 'Курс', compact: true, showAvatar: false },
    'guides-section': { title: 'Гайды', compact: true, showAvatar: false },
    'profile-section': { title: 'Профиль', compact: true, showAvatar: false }
};

function trackAppEvent(name, props = {}) {
    if (typeof trackEvent === 'function') {
        try {
            trackEvent(name, props);
        } catch (error) {
            console.warn(`[Analytics] ${name} error:`, error);
        }
    }
}

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

                if (accessStatus.locked) {
                    card.style.pointerEvents = 'auto';
                    card.addEventListener('click', () => {
                        trackAppEvent('day_locked_clicked', {
                            day_id: dayId,
                            day_number: dayInfo.order
                        });
                    });
                } else {
                    card.setAttribute('role', 'link');
                    card.setAttribute('tabindex', '0');
                    card.addEventListener('click', () => {
                        trackAppEvent('day_opened', {
                            day_id: dayId,
                            day_number: dayInfo.order,
                            day_title: displayTitle
                        });
                        window.location.href = `day.html?id=${dayId}`;
                    });
                    card.addEventListener('keydown', (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            trackAppEvent('day_opened', {
                                day_id: dayId,
                                day_number: dayInfo.order,
                                day_title: displayTitle
                            });
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

function updateAppHeader(sectionId) {
    const header = document.querySelector('.app-header');
    const title = document.getElementById('app-header-title');
    const avatar = document.getElementById('app-header-avatar');
    const displayName = window.currentTelegramUser?.first_name?.trim() || 'друг';
    const config = APP_SECTION_HEADERS[sectionId] || APP_SECTION_HEADERS['home-section'];

    if (!header || !title) {
        return;
    }

    header.classList.toggle('app-header--compact', Boolean(config.compact));

    if (config.title === 'greeting') {
        title.innerHTML = `Привет, <span id="user-name">${displayName}</span>!`;
    } else {
        title.textContent = config.title;
    }

    if (avatar) {
        avatar.style.display = config.showAvatar ? '' : 'none';
    }
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

    if (!isChromeHidden) {
        updateAppHeader(sectionId);
    }

    document.body.classList.toggle('about-open', sectionId === 'about-section');
    document.body.classList.toggle('quiz-open', sectionId === 'quiz-section');
    document.body.dataset.appSection = sectionId;

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

        if (window.guidesApp?.onSectionViewed) {
            window.guidesApp.onSectionViewed();
        }
    }

    if (sectionId === 'profile-section' && typeof initProfile === 'function') {
        initProfile();
    }

    if (sectionId === 'home-section') {
        trackAppEvent('home_viewed', {
            has_access: window.userAccess?.access_type,
            max_day: window.userAccess?.max_day
        });
    }

    if (sectionId === 'course-section') {
        trackAppEvent('course_viewed', {
            max_day: window.userAccess?.max_day
        });
    }

    if (sectionId === 'about-section') {
        trackAppEvent('about_viewed');
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
        ['tab-home', 'home-section', 'home'],
        ['tab-course', 'course-section', 'course'],
        ['tab-guides', 'guides-section', 'guides'],
        ['tab-profile', 'profile-section', 'profile']
    ];

    tabBindings.forEach(([tabId, sectionId, tabName]) => {
        const tab = document.getElementById(tabId);
        if (!tab) return;

        tab.addEventListener('click', (event) => {
            event.preventDefault();
            if (window.Haptic?.selection) {
                window.Haptic.selection();
            }
            trackAppEvent('tab_switched', {
                tab: tabName
            });
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

            if (triggerId === 'btn-about') {
                trackAppEvent('cta_about_clicked', { source: 'hero' });
            }

            if (triggerId === 'card-quiz') {
                trackAppEvent('cta_quiz_clicked', { source: 'home_card' });
            }

            if (triggerId === 'card-continue') {
                trackAppEvent('cta_continue_clicked', { source: 'home_card' });
            }

            showAppSection(sectionId, tabId);
        });
    });

    const startLessonButton = document.getElementById('btn-start-lesson');
    if (startLessonButton) {
        startLessonButton.addEventListener('click', () => {
            trackAppEvent('cta_start_lesson_clicked', { source: 'hero' });
        });
    }

    const aboutBack = document.getElementById('about-back');
    if (aboutBack) {
        aboutBack.addEventListener('click', () => {
            showAppSection('home-section', 'tab-home');
        });
    }

    document.querySelectorAll('.social-pill').forEach((link) => {
        link.addEventListener('click', () => {
            const label = link.querySelector('.social-pill__label')?.textContent?.toLowerCase() || '';
            const platformMap = {
                tiktok: 'tiktok',
                instagram: 'instagram',
                telegram: 'telegram'
            };

            trackAppEvent('social_clicked', {
                platform: platformMap[label] || label
            });
        });
    });

    const aboutContactButton = document.querySelector('.about-contact-button');
    if (aboutContactButton) {
        aboutContactButton.addEventListener('click', () => {
            trackAppEvent('contact_clicked', {
                source: 'about'
            });
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
