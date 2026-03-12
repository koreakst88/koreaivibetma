// tma/public/js/analytics.js
// Amplitude Browser SDK — аналитика для Vibe Coding Course TMA

const AMPLITUDE_API_KEY = 'a0ef1f1f77f50fd4c880d99062da5375';

/**
 * Инициализация Amplitude.
 * Вызывается асинхронно, чтобы не блокировать основной поток.
 * @param {Object|null} user — объект из Telegram.WebApp.initDataUnsafe.user
 */
function initAnalytics(user) {
    try {
        if (typeof amplitude === 'undefined') return;

        setTimeout(() => {
            try {
                amplitude.init(AMPLITUDE_API_KEY, {
                    defaultTracking: false,
                    autocapture: false
                });

                if (user && user.id) {
                    amplitude.setUserId(String(user.id));
                }

                // Отправляем событие открытия приложения
                trackEvent('tma_opened', { 
                    page: 'home',
                    path: window.location.pathname 
                });

            } catch (e) {
                // Ошибки аналитики не должны прерывать работу приложения
            }
        }, 500);

    } catch (err) {
        // Ошибки аналитики не должны прерывать работу приложения
    }
}

/**
 * Отправить кастомное событие в Amplitude.
 * Все вызовы обёрнуты в try/catch — аналитика не должна ломать UI.
 * @param {string} name — название события (snake_case)
 * @param {Object} [props={}] — дополнительные свойства события
 */
function trackEvent(name, props) {
    try {
        if (typeof amplitude === 'undefined') return;

        const eventProps = props || {};
        amplitude.track(name, eventProps);
    } catch (err) {
        // Ошибки аналитики не должны прерывать работу приложения
    }
}
