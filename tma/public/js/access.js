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

// Коды разблокировки дней
const UNLOCK_CODES = {
    'DAY0': 'day-0',
    'DAY1': 'day-1',
    'DAY2': 'day-2',
    'DAY3': 'day-3',
    'DAY4': 'day-4',
    'DAY5': 'day-5',
    'DAY6': 'day-6',
    'DAY7': 'day-7'
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

function saveUnlockedDays(days) {
    try {
        if (!Array.isArray(days)) {
            return false;
        }

        const unique = [...new Set(days.filter(dayId => typeof dayId === 'string' && Boolean(DAYS_CONFIG[dayId])))];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
        return true;
    } catch (error) {
        console.error('Error saving unlocked days to storage:', error);
        return false;
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

function unlockDay(code) {
    try {
        if (typeof code !== 'string' || !code.trim()) {
            return {
                success: false,
                message: 'Код не может быть пустым'
            };
        }

        const normalizedCode = code.trim().toUpperCase();
        if (!UNLOCK_CODES[normalizedCode]) {
            return {
                success: false,
                message: 'Неверный код разблокировки'
            };
        }

        const dayId = UNLOCK_CODES[normalizedCode];
        if (!DAYS_CONFIG[dayId]) {
            return {
                success: false,
                message: 'Ошибка конфигурации кода'
            };
        }

        const unlockedDays = getUnlockedDays();
        const dayTitle = DAYS_CONFIG[dayId].title;

        if (unlockedDays.includes(dayId)) {
            return {
                success: true,
                message: `День "${dayTitle}" уже разблокирован`,
                dayTitle: dayTitle,
                alreadyUnlocked: true
            };
        }

        const updatedDays = [...unlockedDays, dayId];
        const saved = saveUnlockedDays(updatedDays);

        if (!saved) {
            return {
                success: false,
                message: 'Ошибка сохранения данных'
            };
        }

        window.userAccess = {
            access_type: 'partial',
            max_day: Math.max(Number(window.userAccess?.max_day ?? 0), DAYS_CONFIG[dayId].order),
            is_active: true
        };

        return {
            success: true,
            message: `День "${dayTitle}" успешно разблокирован!`,
            dayTitle: dayTitle,
            alreadyUnlocked: false
        };
    } catch (error) {
        console.error('Error unlocking day:', error);
        return {
            success: false,
            message: 'Произошла ошибка при разблокировке'
        };
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

function checkUnlockFromURL() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const unlockCode = urlParams.get('unlock');

        if (!unlockCode) {
            return null;
        }

        const result = unlockDay(unlockCode);

        if (result.success && window.history && window.history.replaceState) {
            const cleanUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, document.title, cleanUrl);
        }

        return result;
    } catch (error) {
        console.error('Error checking unlock from URL:', error);
        return null;
    }
}

async function getAllDaysWithStatus() {
    try {
        const dayEntries = await Promise.all(
            Object.keys(DAYS_CONFIG).map(async dayId => {
                const config = DAYS_CONFIG[dayId];
                const status = await getDayAccessStatus(dayId);

                return {
                    id: dayId,
                    title: config.title,
                    duration: config.duration,
                    order: config.order,
                    locked: status.locked,
                    reason: status.reason,
                    badge: status.badge
                };
            })
        );

        return dayEntries.sort((a, b) => a.order - b.order);
    } catch (error) {
        console.error('Error getting all days with status:', error);
        return [];
    }
}

function resetAllUnlocks() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        window.userAccess = null;
        return true;
    } catch (error) {
        console.error('Error resetting unlocks:', error);
        return false;
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        checkUnlockFromURL();
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DAYS_CONFIG,
        PUBLIC_DAYS,
        getUnlockedDays,
        saveUnlockedDays,
        isDayLocked,
        unlockDay,
        getDayAccessStatus,
        checkUnlockFromURL,
        getAllDaysWithStatus,
        resetAllUnlocks
    };
}
