// tma/public/js/profile.js

(function () {
    let profileSectionTemplate = '';

    function cacheProfileTemplate() {
        const section = document.getElementById('profile-section');
        if (section && !profileSectionTemplate) {
            profileSectionTemplate = section.innerHTML;
        }
    }

    function ensureProfileMarkup() {
        const section = document.getElementById('profile-section');
        if (section && profileSectionTemplate && !section.querySelector('#profile-user-card')) {
            section.innerHTML = profileSectionTemplate;
        }
    }

    function getNormalizedProgress() {
        const source = window.userProgress;

        if (Array.isArray(source)) {
            const mapped = {};

            source.forEach((item) => {
                const dayId = `day-${item.day_number}`;
                mapped[dayId] = {
                    completed: item.status === 'completed',
                    status: item.status || 'not_started'
                };
            });

            return mapped;
        }

        return source && typeof source === 'object' ? source : {};
    }

    function getAccessBadge(accessType) {
        const badges = {
            free: '<span class="access-badge access-badge--free">Бесплатный доступ</span>',
            partial: '<span class="access-badge access-badge--partial">Частичный доступ</span>',
            full: '<span class="access-badge access-badge--full">Полный доступ</span>'
        };

        return badges[accessType] || badges.free;
    }

    function getUserMeta() {
        const user = window.currentTelegramUser || {};
        const firstName = user.first_name?.trim() || 'Гость';
        const username = user.username ? `@${user.username}` : '';
        const avatarUrl = user.photo_url || '';
        const initialSource = user.first_name || user.username || 'Г';
        const initial = initialSource.charAt(0).toUpperCase();

        return { firstName, username, avatarUrl, initial };
    }

    function renderUserCard() {
        const container = document.getElementById('profile-user-card');
        if (!container) return;

        const { firstName, username, avatarUrl, initial } = getUserMeta();
        const accessType = window.userAccess?.access_type || 'free';

        container.innerHTML = `
            <div class="profile-user-card__top">
                ${avatarUrl
                    ? `<img class="profile-avatar" src="${avatarUrl}" alt="${firstName}">`
                    : `<div class="profile-avatar-fallback">${initial}</div>`
                }
                <div class="profile-user-card__meta">
                    <h3>${firstName}</h3>
                    ${username ? `<p>${username}</p>` : ''}
                    ${getAccessBadge(accessType)}
                </div>
            </div>
        `;
    }

    function renderProgressBlock() {
        const container = document.getElementById('profile-progress-block');
        if (!container) return;

        const access = window.userAccess || { max_day: 0 };
        const progress = getNormalizedProgress();
        const days = Object.entries(DAYS_CONFIG).filter(([dayId]) => dayId !== 'day-0');
        const completedCount = days.filter(([dayId]) => progress[dayId]?.completed).length;
        const percentage = Math.round((completedCount / 7) * 100);

        const daysMarkup = days.map(([dayId, info]) => {
            const isCompleted = progress[dayId]?.completed === true;
            const isAccessible = Number(access.max_day || 0) >= Number(info.order);
            const icon = isCompleted ? '✅' : (isAccessible ? '🔓' : '🔒');

            return `
                <div class="progress-day-item">
                    <span class="progress-day-item__icon">${icon}</span>
                    <span class="progress-day-item__title">День ${info.order}: ${info.title}</span>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <h3>Ваш прогресс</h3>
            <div class="course-progress">
                <div class="course-progress__row">
                    <p class="course-progress__label">Пройдено дней</p>
                    <div class="course-progress__value">${completedCount} из 7</div>
                </div>

                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%"></div>
                </div>

                <div class="progress-days-list">
                    ${daysMarkup}
                </div>
            </div>
        `;
    }

    function renderNextStep() {
        const container = document.getElementById('profile-next-step');
        if (!container) return;

        const access = window.userAccess || { max_day: 0 };
        const progress = getNormalizedProgress();

        const nextDay = Object.entries(DAYS_CONFIG)
            .filter(([id]) => id !== 'day-0')
            .find(([id, info]) => {
                const dayNum = info.order;
                const isAccessible = dayNum <= Number(access.max_day || 0);
                const isCompleted = progress[id]?.completed;
                return isAccessible && !isCompleted;
            });

        const allCompleted = Object.entries(DAYS_CONFIG)
            .filter(([id]) => id !== 'day-0')
            .every(([id]) => progress[id]?.completed === true);

        if (Number(access.max_day || 0) === 0) {
            container.innerHTML = `
                <h3>Начните с бесплатного урока</h3>
                <p class="text-secondary">Откройте вводный день и посмотрите, как устроен формат обучения.</p>
                <a class="btn-primary" href="day.html?id=day-0">Открыть урок</a>
            `;
            return;
        }

        if (allCompleted) {
            container.innerHTML = `
                <h3>Курс завершён! 🎉</h3>
                <p class="text-secondary">Вы прошли все 7 дней курса</p>
                <button id="profile-finish-contact" class="btn-primary" type="button">Связаться с преподавателем</button>
            `;
            return;
        }

        if (nextDay) {
            const [dayId, info] = nextDay;
            container.innerHTML = `
                <h3>Продолжите обучение</h3>
                <p class="text-secondary">Следующий день: ${info.title}</p>
                <a class="btn-primary" href="day.html?id=${dayId}">Продолжить</a>
            `;
            return;
        }

        container.innerHTML = `
            <h3>Продолжите обучение</h3>
            <p class="text-secondary">Перейдите к курсу и выберите доступный день.</p>
            <button id="profile-open-course" class="btn-primary" type="button">Перейти к курсу</button>
        `;
    }

    function bindProfileActions() {
        const contactBtn = document.getElementById('profile-contact-btn');
        const courseBtn = document.getElementById('profile-course-btn');
        const finishContactBtn = document.getElementById('profile-finish-contact');
        const openCourseBtn = document.getElementById('profile-open-course');

        const contactTeacherHandler = () => {
            if (window.Haptic?.medium) {
                window.Haptic.medium();
            }
            if (window.Telegram?.WebApp?.openLink) {
                window.Telegram.WebApp.openLink('https://t.me/koreakim88');
            } else {
                window.open('https://t.me/koreakim88', '_blank', 'noopener,noreferrer');
            }
        };

        const openCourseHandler = () => {
            if (typeof showAppSection === 'function') {
                showAppSection('course-section', 'tab-course');
            }
        };

        if (contactBtn) {
            contactBtn.onclick = contactTeacherHandler;
        }

        if (courseBtn) {
            courseBtn.onclick = openCourseHandler;
        }

        if (finishContactBtn) {
            finishContactBtn.onclick = contactTeacherHandler;
        }

        if (openCourseBtn) {
            openCourseBtn.onclick = openCourseHandler;
        }
    }

    function renderProfileEmptyState() {
        const section = document.getElementById('profile-section');
        if (!section || typeof renderEmptyState !== 'function') return;

        renderEmptyState('profile-section', {
            icon: '👤',
            title: 'Открой TMA через Telegram бота',
            subtitle: 'Профиль появится, когда приложение откроется внутри Telegram.'
        });
    }

    async function initProfile() {
        cacheProfileTemplate();
        if (typeof showLoader === 'function') {
            showLoader('profile-section');
        }

        await Promise.resolve();

        if (!window.currentTelegramUser) {
            renderProfileEmptyState();
            return;
        }

        if (!window.userAccess && !window.userProgress) {
            if (typeof renderErrorState === 'function') {
                renderErrorState('profile-section', {
                    text: 'Не удалось загрузить данные',
                    buttonText: 'Попробовать снова',
                    buttonId: 'retry-profile-load'
                });
                document.getElementById('retry-profile-load')?.addEventListener('click', () => {
                    initProfile();
                });
            }
            return;
        }

        if (typeof hideLoader === 'function') {
            hideLoader('profile-section');
        }
        ensureProfileMarkup();

        renderUserCard();
        renderProgressBlock();
        renderNextStep();
        bindProfileActions();

        if (typeof trackEvent === 'function') {
            try {
                trackEvent('profile_viewed');
            } catch (error) {
                console.warn('[Analytics] profile error:', error);
            }
        }
    }

    window.profileApp = {
        initProfile,
        renderUserCard,
        renderProgressBlock,
        renderNextStep,
        getAccessBadge
    };

    window.initProfile = initProfile;
})();
