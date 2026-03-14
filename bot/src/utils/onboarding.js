// bot/src/utils/onboarding.js
// Onboarding серия сообщений для новых пользователей

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { InlineKeyboard } from 'grammy';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_FILE = path.join(__dirname, '../../data/users.json');

// Время задержки для сообщений (в миллисекундах)
const MSG1_DELAY = 24 * 60 * 60 * 1000; // 24 часа
const MSG2_DELAY = 48 * 60 * 60 * 1000; // 48 часа

/**
 * Загрузить данные пользователей из файла
 * @returns {Object} Объект с данными пользователей
 */
function loadUsers() {
    try {
        if (!fs.existsSync(USERS_FILE)) {
            fs.writeFileSync(USERS_FILE, '{}', 'utf8');
            return {};
        }
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data || '{}');
    } catch (error) {
        console.error('[Onboarding] Error loading users:', error);
        return {};
    }
}

/**
 * Сохранить данные пользователей в файл
 * @param {Object} users - Объект с данными пользователей
 */
function saveUsers(users) {
    try {
        const dir = path.dirname(USERS_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    } catch (error) {
        console.error('[Onboarding] Error saving users:', error);
    }
}

/**
 * Зарегистрировать пользователя (вызывается при каждом /start)
 * @param {string} userId - ID пользователя в Telegram
 */
export function registerUser(userId) {
    const users = loadUsers();
    const now = Date.now();

    if (!users[userId]) {
        // Новый пользователь
        users[userId] = {
            startedAt: now,
            onboarding: {
                msg1: false,
                msg2: false
            }
        };
        saveUsers(users);
        console.log(`[Onboarding] Registered new user: ${userId}`);
    } else {
        // Обновляем startedAt если пользователь вернулся после долгого времени
        const user = users[userId];
        const timeSinceStart = now - user.startedAt;
        
        // Если пользователь вернулся через 7+ дней, сбрасываем onboarding
        if (timeSinceStart > 7 * 24 * 60 * 60 * 1000) {
            user.startedAt = now;
            user.onboarding = { msg1: false, msg2: false };
            saveUsers(users);
            console.log(`[Onboarding] Reset onboarding for returning user: ${userId}`);
        }
    }
}

/**
 * Получить список пользователей, которым нужно отправить сообщения
 * @returns {Array} Массив объектов { userId, msg1?, msg2? }
 */
export function getPendingMessages() {
    const users = loadUsers();
    const now = Date.now();
    const pending = [];

    for (const [userId, userData] of Object.entries(users)) {
        const { startedAt, onboarding } = userData;
        const timeSinceStart = now - startedAt;

        // Проверяем сообщение 1 (24 часа)
        if (!onboarding.msg1 && timeSinceStart >= MSG1_DELAY) {
            pending.push({ userId, msg1: true });
        }

        // Проверяем сообщение 2 (48 часов)
        if (!onboarding.msg2 && timeSinceStart >= MSG2_DELAY) {
            pending.push({ userId, msg2: true });
        }
    }

    return pending;
}

/**
 * Отметить сообщение как отправленное
 * @param {string} userId - ID пользователя
 * @param {string} messageType - 'msg1' или 'msg2'
 */
export function markMessageSent(userId, messageType) {
    const users = loadUsers();
    
    if (users[userId]) {
        users[userId].onboarding[messageType] = true;
        saveUsers(users);
        console.log(`[Onboarding] Marked ${messageType} as sent for user: ${userId}`);
    }
}

/**
 * Получить inline клавиатуру для сообщения 1
 * @returns {InlineKeyboard}
 */
export function getMessage1Keyboard() {
    const keyboard = new InlineKeyboard();
    keyboard.url('Написать Евгению', 'https://t.me/koreakim88');
    return keyboard;
}

/**
 * Получить inline клавиатуру для сообщения 2
 * @returns {InlineKeyboard}
 */
export function getMessage2Keyboard() {
    const keyboard = new InlineKeyboard();
    keyboard.url('Примеры работ', 'https://t.me/koredigital');
    return keyboard;
}

/**
 * Текст сообщения 1 (24 часа)
 * @returns {string}
 */
export function getMessage1Text() {
    return `Добрый день 👋

Надеюсь материалы курса оказались полезными. Если пробовали 
настройки из Дня 0 или работали с промптами — буду рад услышать 
как прошло.

Если возникли вопросы или появились идеи для своего проекта — 
пишите напрямую, разберёмся вместе 🙌`;
}

/**
 * Текст сообщения 2 (48 часов)
 * @returns {string}
 */
export function getMessage2Text() {
    return `Хочу показать вам несколько проектов которые были созданы 
с помощью ИИ — реальные работы, не концепты.

Посмотрите сами 👇`;
}

/**
 * Отправить onboarding сообщение пользователю
 * @param {Object} bot - Экземпляр бота Grammy
 * @param {string} userId - ID пользователя
 * @param {string} messageType - 'msg1' или 'msg2'
 */
export async function sendOnboardingMessage(bot, userId, messageType) {
    try {
        let text, keyboard;

        if (messageType === 'msg1') {
            text = getMessage1Text();
            keyboard = getMessage1Keyboard();
        } else if (messageType === 'msg2') {
            text = getMessage2Text();
            keyboard = getMessage2Keyboard();
        } else {
            console.error(`[Onboarding] Unknown message type: ${messageType}`);
            return false;
        }

        await bot.api.sendMessage(userId, text, {
            reply_markup: keyboard
        });

        markMessageSent(userId, messageType);
        console.log(`[Onboarding] Sent ${messageType} to user: ${userId}`);
        return true;
    } catch (error) {
        // Игнорируем ошибки (пользователь мог заблокировать бота)
        if (error.description?.includes('bot was blocked by the user') ||
            error.description?.includes('user is deactivated') ||
            error.description?.includes('chat not found')) {
            console.log(`[Onboarding] User ${userId} blocked bot or is deactivated, skipping...`);
            // Помечаем как отправленное чтобы не пытаться снова
            markMessageSent(userId, messageType);
        } else {
            console.error(`[Onboarding] Error sending ${messageType} to user ${userId}:`, error.message);
        }
        return false;
    }
}

/**
 * Запустить проверку и отправку отложенных сообщений
 * @param {Object} bot - Экземпляр бота Grammy
 */
export async function processOnboardingQueue(bot) {
    console.log('[Onboarding] Checking for pending messages...');
    
    const pending = getPendingMessages();
    
    if (pending.length === 0) {
        console.log('[Onboarding] No pending messages');
        return;
    }

    console.log(`[Onboarding] Found ${pending.length} pending messages`);

    for (const item of pending) {
        if (item.msg1) {
            await sendOnboardingMessage(bot, item.userId, 'msg1');
        }
        if (item.msg2) {
            await sendOnboardingMessage(bot, item.userId, 'msg2');
        }
    }

    console.log('[Onboarding] Queue processing complete');
}
