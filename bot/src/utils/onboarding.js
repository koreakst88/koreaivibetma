// bot/src/utils/onboarding.js
// Onboarding серия сообщений для новых пользователей

import { Pool } from 'pg';
import { InlineKeyboard } from 'grammy';

// PostgreSQL pool connection
const dbUrl = process.env.DATABASE_URL;
console.log('[DB] Connecting to:', dbUrl ? dbUrl.replace(/:\/\/.*@/, '://***@') : 'NOT SET');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Время задержки для сообщений (в миллисекундах)
const MSG1_DELAY = 24 * 60 * 60 * 1000; // 24 часа
const MSG2_DELAY = 48 * 60 * 60 * 1000; // 48 часа

/**
 * Инициализировать таблицу пользователей
 */
export async function initOnboardingTable() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS onboarding_users (
                user_id BIGINT PRIMARY KEY,
                started_at TIMESTAMP DEFAULT NOW(),
                msg1_sent BOOLEAN DEFAULT FALSE,
                msg2_sent BOOLEAN DEFAULT FALSE
            )
        `);
        console.log('[Onboarding] Table initialized successfully');
    } catch (error) {
        console.error('[Onboarding] Error initializing table:', error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Зарегистрировать пользователя (вызывается при каждом /start)
 * @param {string} userId - ID пользователя в Telegram
 */
export async function registerUser(userId) {
    const client = await pool.connect();
    try {
        // Проверяем существует ли пользователь
        const existingUser = await client.query(
            'SELECT user_id, started_at, msg1_sent, msg2_sent FROM onboarding_users WHERE user_id = $1',
            [userId]
        );

        if (existingUser.rows.length === 0) {
            // Новый пользователь
            await client.query(
                'INSERT INTO onboarding_users (user_id, started_at, msg1_sent, msg2_sent) VALUES ($1, NOW(), FALSE, FALSE)',
                [userId]
            );
            console.log(`[Onboarding] Registered new user: ${userId}`);
        } else {
            // Проверяем нужно ли сбросить onboarding (7+ дней)
            const user = existingUser.rows[0];
            const timeSinceStart = Date.now() - new Date(user.started_at).getTime();

            if (timeSinceStart > 7 * 24 * 60 * 60 * 1000) {
                await client.query(
                    'UPDATE onboarding_users SET started_at = NOW(), msg1_sent = FALSE, msg2_sent = FALSE WHERE user_id = $1',
                    [userId]
                );
                console.log(`[Onboarding] Reset onboarding for returning user: ${userId}`);
            }
        }
    } catch (error) {
        console.error('[Onboarding] Error registering user:', error);
    } finally {
        client.release();
    }
}

/**
 * Получить список пользователей, которым нужно отправить сообщения
 * @returns {Array} Массив объектов { userId, msg1?, msg2? }
 */
export async function getPendingMessages() {
    const client = await pool.connect();
    try {
        const now = new Date();
        const msg1Threshold = new Date(now.getTime() - MSG1_DELAY);
        const msg2Threshold = new Date(now.getTime() - MSG2_DELAY);

        const result = await client.query(`
            SELECT user_id, msg1_sent, msg2_sent, started_at
            FROM onboarding_users
            WHERE (msg1_sent = FALSE AND started_at <= $1)
               OR (msg2_sent = FALSE AND started_at <= $2)
        `, [msg1Threshold, msg2Threshold]);

        const pending = [];
        for (const row of result.rows) {
            const timeSinceStart = now - new Date(row.started_at).getTime();

            if (!row.msg1_sent && timeSinceStart >= MSG1_DELAY) {
                pending.push({ userId: row.user_id, msg1: true });
            }
            if (!row.msg2_sent && timeSinceStart >= MSG2_DELAY) {
                pending.push({ userId: row.user_id, msg2: true });
            }
        }

        return pending;
    } catch (error) {
        console.error('[Onboarding] Error getting pending messages:', error);
        return [];
    } finally {
        client.release();
    }
}

/**
 * Отметить сообщение как отправленное
 * @param {string} userId - ID пользователя
 * @param {string} messageType - 'msg1' или 'msg2'
 */
export async function markMessageSent(userId, messageType) {
    const client = await pool.connect();
    try {
        const column = messageType === 'msg1' ? 'msg1_sent' : 'msg2_sent';
        await client.query(
            `UPDATE onboarding_users SET ${column} = TRUE WHERE user_id = $1`,
            [userId]
        );
        console.log(`[Onboarding] Marked ${messageType} as sent for user: ${userId}`);
    } catch (error) {
        console.error('[Onboarding] Error marking message as sent:', error);
    } finally {
        client.release();
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

        await markMessageSent(userId, messageType);
        console.log(`[Onboarding] Sent ${messageType} to user: ${userId}`);
        return true;
    } catch (error) {
        // Игнорируем ошибки (пользователь мог заблокировать бота)
        if (error.description?.includes('bot was blocked by the user') ||
            error.description?.includes('user is deactivated') ||
            error.description?.includes('chat not found')) {
            console.log(`[Onboarding] User ${userId} blocked bot or is deactivated, skipping...`);
            // Помечаем как отправленное чтобы не пытаться снова
            await markMessageSent(userId, messageType);
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

    const pending = await getPendingMessages();

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

/**
 * Закрыть соединение с базой данных (при остановке бота)
 */
export async function closeOnboardingPool() {
    await pool.end();
    console.log('[Onboarding] Database connection closed');
}
