(function () {
    const loaderState = new Map();

    function getContainer(containerId) {
        return typeof containerId === 'string'
            ? document.getElementById(containerId)
            : containerId;
    }

    function skeletonCard() {
        return `
            <div class="skeleton-card card">
                <div class="skeleton-circle"></div>
                <div class="skeleton-card__content">
                    <div class="skeleton-line skeleton-line--title"></div>
                    <div class="skeleton-line skeleton-line--text"></div>
                </div>
            </div>
        `;
    }

    function skeletonText() {
        return `
            <div class="skeleton-block">
                <div class="skeleton-line skeleton-line--short"></div>
                <div class="skeleton-line skeleton-line--full"></div>
                <div class="skeleton-line skeleton-line--medium"></div>
            </div>
        `;
    }

    function skeletonHero() {
        return `
            <div class="skeleton-hero card">
                <div class="skeleton-line skeleton-line--pill"></div>
                <div class="skeleton-line skeleton-line--hero-title"></div>
                <div class="skeleton-line skeleton-line--hero-text"></div>
                <div class="skeleton-line skeleton-line--hero-text-short"></div>
                <div class="skeleton-button-row">
                    <div class="skeleton-button"></div>
                    <div class="skeleton-button skeleton-button--secondary"></div>
                </div>
            </div>
        `;
    }

    function getTemplate(containerId) {
        if (containerId === 'days-container') {
            return `${skeletonCard()}${skeletonCard()}${skeletonCard()}`;
        }

        if (containerId === 'day-content') {
            return skeletonText();
        }

        if (containerId === 'profile-section') {
            return `${skeletonHero()}${skeletonCard()}${skeletonText()}`;
        }

        return skeletonText();
    }

    function showLoader(containerId) {
        const container = getContainer(containerId);
        if (!container) return;

        const existingState = loaderState.get(containerId);
        if (existingState?.timeoutId) {
            clearTimeout(existingState.timeoutId);
        }

        const previousHTML = container.innerHTML;
        container.innerHTML = `<div class="js-loader-root" aria-busy="true">${getTemplate(containerId)}</div>`;

        const timeoutId = window.setTimeout(() => {
            hideLoader(containerId);
        }, 3000);

        loaderState.set(containerId, { previousHTML, timeoutId });
    }

    function hideLoader(containerId) {
        const container = getContainer(containerId);
        if (!container) return;

        const state = loaderState.get(containerId);
        if (state?.timeoutId) {
            clearTimeout(state.timeoutId);
        }

        const loaderRoot = container.querySelector('.js-loader-root');
        if (loaderRoot) {
            container.innerHTML = state?.previousHTML || '';
        }

        loaderState.delete(containerId);
    }

    function renderEmptyState(containerId, options = {}) {
        const container = getContainer(containerId);
        if (!container) return;

        hideLoader(containerId);

        const {
            icon = 'ℹ️',
            title = 'Пока пусто',
            subtitle = '',
            buttonText = '',
            buttonHref = '',
            buttonId = ''
        } = options;

        const buttonMarkup = buttonText
            ? (buttonHref
                ? `<a class="btn-secondary empty-state__button" href="${buttonHref}">${buttonText}</a>`
                : `<button class="btn-secondary empty-state__button" type="button"${buttonId ? ` id="${buttonId}"` : ''}>${buttonText}</button>`)
            : '';

        container.innerHTML = `
            <div class="empty-state card">
                <div class="empty-state__icon">${icon}</div>
                <h3 class="empty-state__title">${title}</h3>
                ${subtitle ? `<p class="empty-state__subtitle text-secondary">${subtitle}</p>` : ''}
                ${buttonMarkup}
            </div>
        `;
    }

    function renderErrorState(containerId, options = {}) {
        const container = getContainer(containerId);
        if (!container) return;

        hideLoader(containerId);

        const {
            text = 'Не удалось загрузить данные',
            buttonText = 'Попробовать снова',
            buttonId = '',
            inline = false
        } = options;

        container.innerHTML = `
            <div class="error-state${inline ? ' error-state--inline' : ''}">
                <div class="error-state__icon">⚠️</div>
                <div class="error-state__content">
                    <p class="error-state__text">${text}</p>
                    ${buttonText ? `<button class="btn-secondary error-state__button" type="button"${buttonId ? ` id="${buttonId}"` : ''}>${buttonText}</button>` : ''}
                </div>
            </div>
        `;
    }

    const Haptic = {
        light() {
            try {
                window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
            } catch (error) {}
        },
        medium() {
            try {
                window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
            } catch (error) {}
        },
        success() {
            try {
                window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
            } catch (error) {}
        },
        error() {
            try {
                window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
            } catch (error) {}
        },
        warning() {
            try {
                window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('warning');
            } catch (error) {}
        },
        selection() {
            try {
                window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
            } catch (error) {}
        }
    };

    window.showLoader = showLoader;
    window.hideLoader = hideLoader;
    window.renderEmptyState = renderEmptyState;
    window.renderErrorState = renderErrorState;
    window.Haptic = Haptic;
})();
