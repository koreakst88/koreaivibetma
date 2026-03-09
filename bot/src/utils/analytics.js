import fetch from 'node-fetch';

const MEASUREMENT_ID = 'G-X05FCBFLMY';
const API_SECRET = process.env.GA_API_SECRET || 'YOUR_API_SECRET_HERE';

// Отправка события в Google Analytics 4
export async function trackEvent(userId, eventName, params = {}) {
    try {
        const payload = {
            client_id: userId.toString(),
            events: [{
                name: eventName,
                params: {
                    engagement_time_msec: '100',
                    session_id: Date.now().toString(),
                    ...params
                }
            }]
        };

        const response = await fetch(
            `https://www.google-analytics.com/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }
        );

        if (!response.ok) {
            console.error('GA tracking failed:', response.status);
        }
    } catch (error) {
        console.error('GA tracking error:', error.message);
    }
}

// Вспомогательные функции для типовых событий
export function trackBotStart(userId, username) {
    return trackEvent(userId, 'bot_started', {
        username: username || 'anonymous',
        platform: 'telegram'
    });
}

export function trackCodeEntered(userId, code, dayId) {
    return trackEvent(userId, 'code_entered', {
        code: code,
        day: dayId,
        success: true
    });
}

export function trackTMAOpened(userId) {
    return trackEvent(userId, 'tma_opened', {
        platform: 'telegram_mini_app'
    });
}

export function trackEnrollmentInterest(userId) {
    return trackEvent(userId, 'enrollment_interest', {
        source: 'bot_command'
    });
}
