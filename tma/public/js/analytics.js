// tma/public/js/analytics.js
alert('analytics.js загружен v2');
// Amplitude Browser SDK — аналитика для Vibe Coding Course TMA

const AMPLITUDE_API_KEY = 'a0ef1f1f77f50fd4c880d99062da5375'; // ← замените на реальный ключ

/**
 * Инициализация Amplitude.
 * Вызывается асинхронно, чтобы не блокировать основной поток.
 * @param {Object|null} user — объект из Telegram.WebApp.initDataUnsafe.user
 */
function initAnalytics(user) {
    try {
        // Проверяем, что Amplitude SDK загружен через CDN
        if (typeof amplitude === 'undefined') {
            console.warn('[Analytics] Amplitude SDK не загружен');
            return;
        }

        // Инициализируем асинхронно, чтобы не блокировать рендер
        setTimeout(() => {
            try {
                amplitude.init(AMPLITUDE_API_KEY, {
                    defaultTracking: false,
                    autocapture: false
                });

                if (user && user.id) {
                    amplitude.setUserId(String(user.id));
                }

                amplitude.track('tma_opened', {
                    page: window.location.pathname,
                    has_user: !!(user && user.id)
                });

                alert('[Analytics] OK. User: ' + JSON.stringify(user));

            } catch (e) {
                alert('[Analytics] ОШИБКА: ' + e.message);
            }
        }, 500);

    } catch (err) {
        // TMA может открываться вне Telegram — не ломаем приложение
        console.warn('[Analytics] initAnalytics ошибка:', err);
    }
}

window.debugAmplitude = function() {
    console.log('amplitude loaded:', typeof amplitude);
    console.log('trackEvent:', typeof trackEvent);
    try {
        trackEvent('debug_test', {source: 'manual'});
        alert('trackEvent вызван успешно');
    } catch(e) {
        alert('Ошибка: ' + e.message);
    }
};

/**
 * Отправить кастомное событие в Amplitude.
 * Все вызовы обёрнуты в try/catch — аналитика не должна ломать UI.
 * @param {string} name — название события (snake_case)
 * @param {Object} [props={}] — дополнительные свойства события
 */
function trackEvent(name, props) {
    try {
        if (typeof amplitude === 'undefined') {
            console.warn('[Analytics] trackEvent: Amplitude не загружен, событие пропущено:', name);
            return;
        }

        const eventProps = props || {};

        amplitude.track(name, eventProps);

        console.log('[Analytics] Событие:', name, eventProps);
    } catch (err) {
        // Никогда не бросаем ошибку наружу — аналитика не должна ломать приложение
        console.warn('[Analytics] trackEvent ошибка:', err);
    }
}
