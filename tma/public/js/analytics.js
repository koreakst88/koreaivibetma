// tma/public/js/analytics.js
// Amplitude Browser SDK — аналитика для Vibe Coding Course TMA

const AMPLITUDE_API_KEY = 'a0ef1f1f77f50fd4c880d99062da5375';
let _amplitudeInitialized = false;

/**
 * Инициализация Amplitude.
 * Вызывается асинхронно, чтобы не блокировать основной поток.
 * @param {Object|null} user — объект из Telegram.WebApp.initDataUnsafe.user
 */
function initAnalytics(user) {
    console.log('[Analytics] initAnalytics вызван, amplitude:', typeof amplitude);

    // Прямой HTTP запрос к Amplitude API — без SDK
    fetch('https://api.amplitude.com/2/httpapi', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            api_key: 'a0ef1f1f77f50fd4c880d99062da5375',
            events: [{
                event_type: 'tma_opened_fetch',
                device_id: 'tma-test-' + Date.now()
            }]
        })
    });

    setTimeout(() => {
        console.log('[Analytics] setTimeout сработал, amplitude:', typeof amplitude);

        try {
            if (typeof amplitude === 'undefined') {
                console.warn('[Analytics] amplitude не загружен!');
                return;
            }

            if (!_amplitudeInitialized) {
                amplitude.init(AMPLITUDE_API_KEY, {
                    defaultTracking: false,
                    autocapture: false
                });
                _amplitudeInitialized = true;
                console.log('[Analytics] amplitude.init вызван успешно');
            }

            if (user && user.id) {
                amplitude.setUserId(String(user.id));
            }

            trackEvent('tma_opened', { 
                page: window.location.pathname
            });

        } catch(e) {
            console.error('[Analytics] ошибка:', e.message);
        }
    }, 500);
}

/**
 * Отправить кастомное событие в Amplitude.
 * Все вызовы обёрнуты в try/catch — аналитика не должна ломать UI.
 * @param {string} name — название события (snake_case)
 * @param {Object} [props={}] — дополнительные свойства события
 */
function trackEvent(name, props) {
    console.log('[Analytics] trackEvent вызван:', name, typeof amplitude);
    try {
        if (typeof amplitude === 'undefined') {
            console.warn('[Analytics] amplitude undefined, пропускаем:', name);
            return;
        }
        const eventProps = props || {};
        console.log('[Analytics] amplitude.track вызывается...');
        amplitude.track(name, eventProps);
        console.log('[Analytics] Событие отправлено:', name, eventProps);
    } catch (err) {
        console.error('[Analytics] trackEvent ошибка:', name, err.message);
    }
}
