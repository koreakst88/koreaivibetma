// tma/public/js/analytics.js
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
                    defaultTracking: false, // только кастомные события
                    autocapture: false,
                });

                // Устанавливаем userId из Telegram, если пользователь доступен
                if (user && user.id) {
                    amplitude.setUserId(String(user.id));

                    // Устанавливаем user properties
                    const identifyEvent = new amplitude.Identify();

                    if (user.username) {
                        identifyEvent.set('username', user.username);
                    }
                    if (user.first_name) {
                        identifyEvent.set('first_name', user.first_name);
                    }
                    if (user.last_name) {
                        identifyEvent.set('last_name', user.last_name);
                    }
                    if (user.language_code) {
                        identifyEvent.set('language_code', user.language_code);
                    }

                    amplitude.identify(identifyEvent);
                }

                console.log('[Analytics] Amplitude инициализирован', user ? `userId=${user.id}` : '(без userId)');
            } catch (err) {
                console.warn('[Analytics] Ошибка инициализации Amplitude:', err);
            }
        }, 0);

    } catch (err) {
        // TMA может открываться вне Telegram — не ломаем приложение
        console.warn('[Analytics] initAnalytics ошибка:', err);
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
