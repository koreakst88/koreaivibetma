/**
 * Модуль контроля доступа для Telegram Mini App
 * Управляет разблокировкой дней курса через коды доступа
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

// Ключ для хранения в LocalStorage
const STORAGE_KEY = 'tma_unlocked_days';

/**
 * Получить список разблокированных дней из LocalStorage
 * @returns {string[]} Массив ID разблокированных дней
 */
function getUnlockedDays() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        
        if (!stored) {
            return [];
        }

        const parsed = JSON.parse(stored);
        
        // Валидация: должен быть массив
        if (!Array.isArray(parsed)) {
            console.warn('Invalid unlocked days format in storage, resetting');
            localStorage.removeItem(STORAGE_KEY);
            return [];
        }

        // Валидация: все элементы должны быть строками и существовать в конфиге
        const validated = parsed.filter(dayId => {
            if (typeof dayId !== 'string') {
                console.warn(`Invalid day ID type: ${typeof dayId}`);
                return false;
            }
            if (!DAYS_CONFIG[dayId]) {
                console.warn(`Unknown day ID in storage: ${dayId}`);
                return false;
            }
            return true;
        });

        return validated;
    } catch (error) {
        console.error('Error reading unlocked days from storage:', error);
        return [];
    }
}

/**
 * Сохранить список разблокированных дней в LocalStorage
 * @param {string[]} days - Массив ID дней для сохранения
 * @returns {boolean} Успешность операции
 */
function saveUnlockedDays(days) {
    try {
        // Валидация входных данных
        if (!Array.isArray(days)) {
            console.error('saveUnlockedDays: days must be an array');
            return false;
        }

        // Фильтрация и валидация
        const validated = days.filter(dayId => {
            if (typeof dayId !== 'string') {
                console.warn(`Skipping invalid day ID type: ${typeof dayId}`);
                return false;
            }
            if (!DAYS_CONFIG[dayId]) {
                console.warn(`Skipping unknown day ID: ${dayId}`);
                return false;
            }
            return true;
        });

        // Удаление дубликатов
        const unique = [...new Set(validated)];

        localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
        return true;
    } catch (error) {
        console.error('Error saving unlocked days to storage:', error);
        return false;
    }
}

/**
 * Проверить, заблокирован ли день
 * @param {string} dayId - ID дня для проверки
 * @returns {boolean} true если день заблокирован, false если доступен
 */
function isDayLocked(dayId) {
    try {
        // Проверка существования дня
        if (!DAYS_CONFIG[dayId]) {
            console.warn(`isDayLocked: unknown day ID: ${dayId}`);
            return true; // Неизвестные дни считаются заблокированными
        }

        // Публичные дни всегда открыты
        if (PUBLIC_DAYS.includes(dayId)) {
            return false;
        }

        // Проверка в списке разблокированных
        const unlockedDays = getUnlockedDays();
        return !unlockedDays.includes(dayId);
    } catch (error) {
        console.error('Error checking day lock status:', error);
        return true; // В случае ошибки считаем день заблокированным
    }
}

/**
 * Разблокировать день по коду
 * @param {string} code - Код разблокировки
 * @returns {Object} Результат операции {success, message, dayTitle?, alreadyUnlocked?}
 */
function unlockDay(code) {
    try {
        // Валидация входных данных
        if (typeof code !== 'string' || !code.trim()) {
            return {
                success: false,
                message: 'Код не может быть пустым'
            };
        }

        // Нормализация кода (верхний регистр, удаление пробелов)
        const normalizedCode = code.trim().toUpperCase();

        // Проверка существования кода
        if (!UNLOCK_CODES[normalizedCode]) {
            return {
                success: false,
                message: 'Неверный код разблокировки'
            };
        }

        const dayId = UNLOCK_CODES[normalizedCode];

        // Проверка существования дня в конфиге
        if (!DAYS_CONFIG[dayId]) {
            console.error(`Unlock code points to unknown day: ${dayId}`);
            return {
                success: false,
                message: 'Ошибка конфигурации кода'
            };
        }

        const dayTitle = DAYS_CONFIG[dayId].title;

        // Проверка, не разблокирован ли уже
        const unlockedDays = getUnlockedDays();
        if (unlockedDays.includes(dayId)) {
            return {
                success: true,
                message: `День "${dayTitle}" уже разблокирован`,
                dayTitle: dayTitle,
                alreadyUnlocked: true
            };
        }

        // Разблокировка дня
        const updatedDays = [...unlockedDays, dayId];
        const saved = saveUnlockedDays(updatedDays);

        if (!saved) {
            return {
                success: false,
                message: 'Ошибка сохранения данных'
            };
        }

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

/**
 * Получить статус доступа к дню
 * @param {string} dayId - ID дня
 * @returns {Object} Статус {locked, reason, badge}
 */
function getDayAccessStatus(dayId) {
    try {
        // Проверка существования дня
        if (!DAYS_CONFIG[dayId]) {
            console.warn(`getDayAccessStatus: unknown day ID: ${dayId}`);
            return {
                locked: true,
                reason: 'locked',
                badge: 'Неизвестный день'
            };
        }

        // Публичный день
        if (PUBLIC_DAYS.includes(dayId)) {
            return {
                locked: false,
                reason: 'public',
                badge: 'Бесплатно'
            };
        }

        // Проверка разблокировки
        const unlockedDays = getUnlockedDays();
        if (unlockedDays.includes(dayId)) {
            return {
                locked: false,
                reason: 'unlocked',
                badge: 'Открыто'
            };
        }

        // Заблокирован
        return {
            locked: true,
            reason: 'locked',
            badge: 'Требуется код'
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

/**
 * Проверить параметр unlock в URL и автоматически разблокировать день
 * @returns {Object|null} Результат разблокировки или null если параметра нет
 */
function checkUnlockFromURL() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const unlockCode = urlParams.get('unlock');

        if (!unlockCode) {
            return null;
        }

        console.log('Found unlock code in URL:', unlockCode);

        // Попытка разблокировки
        const result = unlockDay(unlockCode);

        // Очистка URL от параметра unlock (опционально)
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

/**
 * Получить все дни с их статусами доступа
 * @returns {Array} Массив объектов с информацией о днях
 */
function getAllDaysWithStatus() {
    try {
        return Object.keys(DAYS_CONFIG).map(dayId => {
            const config = DAYS_CONFIG[dayId];
            const status = getDayAccessStatus(dayId);
            
            return {
                id: dayId,
                title: config.title,
                duration: config.duration,
                order: config.order,
                locked: status.locked,
                reason: status.reason,
                badge: status.badge
            };
        }).sort((a, b) => a.order - b.order);
    } catch (error) {
        console.error('Error getting all days with status:', error);
        return [];
    }
}

/**
 * Сбросить все разблокировки (для отладки)
 * @returns {boolean} Успешность операции
 */
function resetAllUnlocks() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        console.log('All unlocks have been reset');
        return true;
    } catch (error) {
        console.error('Error resetting unlocks:', error);
        return false;
    }
}

// Инициализация при загрузке страницы
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        const unlockResult = checkUnlockFromURL();
        
        if (unlockResult) {
            console.log('Auto-unlock result:', unlockResult);
            
            // Можно показать уведомление пользователю
            if (unlockResult.success && !unlockResult.alreadyUnlocked) {
                console.log(`✅ ${unlockResult.message}`);
            }
        }
    });
}

// Экспорт функций для использования в других модулях
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
