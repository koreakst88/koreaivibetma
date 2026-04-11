/**
 * Модуль контроля доступа для Telegram Mini App
 * Управляет разблокировкой дней курса через Supabase с fallback на LocalStorage
 */

// Конфигурация дней курса
const DAYS_CONFIG = {
    'day-0': { title: 'Подготовка', duration: '90 мин', order: 0 },
    'day-1': { title: 'Vibe Coding', duration: '60 мин', order: 1 },
    'day-2': { title: 'Архитектура TMA', duration: '60 мин', order: 2 },
    'day-3': { title: 'Корзина и формы', duration: '90 мин', order: 3 },
    'day-4': { title: 'Интеграция с Telegram', duration: '75 мин', order: 4 },
    'day-5': { title: 'Платежи и API', duration: '60 мин', order: 5 },
    'day-6': { title: 'Автоматизация', duration: '75 мин', order: 6 },
    'day-7': { title: 'Аналитика и финал', duration: '60 мин', order: 7 }
};

// Публичные дни (доступны всем без кода)
const PUBLIC_DAYS = ['day-0'];

// Ключ для хранения fallback-доступа в LocalStorage
const STORAGE_KEY = 'tma_unlocked_days';

function getTelegramUserId() {
    return (
        window.currentTelegramUserId ||
        window.Telegram?.WebApp?.initDataUnsafe?.user?.id ||
        null
    );
}

function getUnlockedDays() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);

        if (!stored) {
            return [];
        }

        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) {
            localStorage.removeItem(STORAGE_KEY);
            return [];
        }

        return parsed.filter(dayId => typeof dayId === 'string' && Boolean(DAYS_CONFIG[dayId]));
    } catch (error) {
        console.error('Error reading unlocked days from storage:', error);
        return [];
    }
}

function getFallbackAccessState() {
    const unlockedDays = getUnlockedDays();
    const maxDay = unlockedDays.reduce((currentMax, dayId) => {
        return Math.max(currentMax, DAYS_CONFIG[dayId]?.order || 0);
    }, 0);

    return {
        access_type: maxDay > 0 ? 'partial' : 'free',
        max_day: maxDay,
        is_active: true
    };
}

async function resolveUserAccess() {
    const telegramUserId = getTelegramUserId();
    const fallbackAccess = getFallbackAccessState();

    if (!telegramUserId || !window.supabaseStore?.getUserAccess) {
        window.userAccess = fallbackAccess;
        return fallbackAccess;
    }

    try {
        const remoteAccess = await window.supabaseStore.getUserAccess(telegramUserId);

        if (remoteAccess && typeof remoteAccess.max_day !== 'undefined') {
            const remoteMaxDay = Number(remoteAccess.max_day ?? 0);
            const fallbackMaxDay = Number(fallbackAccess.max_day ?? 0);
            const mergedMaxDay = Math.max(remoteMaxDay, fallbackMaxDay);
            const mergedAccess = {
                access_type: remoteAccess.access_type || (mergedMaxDay > 0 ? 'partial' : 'free'),
                max_day: mergedMaxDay,
                is_active: remoteAccess.is_active !== false
            };

            if (mergedMaxDay > remoteMaxDay && mergedAccess.access_type === 'free') {
                mergedAccess.access_type = 'partial';
            }

            window.userAccess = mergedAccess;
            return mergedAccess;
        }
    } catch (error) {
        console.error('Error resolving user access from Supabase:', error);
    }

    window.userAccess = fallbackAccess;
    return fallbackAccess;
}

function getDayNumber(dayId) {
    return DAYS_CONFIG[dayId]?.order ?? null;
}

async function isDayLocked(dayId) {
    try {
        if (!DAYS_CONFIG[dayId]) {
            console.warn(`isDayLocked: unknown day ID: ${dayId}`);
            return true;
        }

        if (PUBLIC_DAYS.includes(dayId)) {
            return false;
        }

        const access = await resolveUserAccess();
        const maxDay = Number(access?.max_day ?? 0);

        return getDayNumber(dayId) > maxDay;
    } catch (error) {
        console.error('Error checking day lock status:', error);
        return true;
    }
}

async function getDayAccessStatus(dayId) {
    try {
        if (!DAYS_CONFIG[dayId]) {
            return {
                locked: true,
                reason: 'locked',
                badge: 'Неизвестный день'
            };
        }

        if (PUBLIC_DAYS.includes(dayId)) {
            return {
                locked: false,
                reason: 'public',
                badge: 'Бесплатно'
            };
        }

        const locked = await isDayLocked(dayId);

        return {
            locked,
            reason: locked ? 'locked' : 'unlocked',
            badge: locked ? 'Требуется доступ' : 'Открыто'
        };
    } catch (error) {
        console.error('Error getting day access status:', error);
        return {
            locked: true,
            reason: 'locked',
            badge: 'Ошибка'
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DAYS_CONFIG,
        PUBLIC_DAYS,
        getUnlockedDays,
        isDayLocked,
        getDayAccessStatus
    };
}
