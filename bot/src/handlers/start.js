import { InlineKeyboard } from 'grammy';
import { trackBotStart } from '../utils/analytics.js';
import { trackEvent, setUserProperties } from '../utils/amplitude.js';
import { registerUser } from '../utils/onboarding.js';

export async function handleStart(ctx) {
    // Регистрируем пользователя для onboarding серии
    registerUser(ctx.from.id);

    await trackBotStart(ctx.from.id, ctx.from.username);

    // Amplitude tracking (asynchronous, non-blocking)
    setUserProperties(ctx.from.id, {
        username: ctx.from.username,
        first_name: ctx.from.first_name,
        language_code: ctx.from.language_code
    });
    trackEvent(ctx.from.id, 'bot_started');

    const tmaUrl = process.env.TMA_URL;

    const keyboard = new InlineKeyboard()
        .webApp('🚀 Открыть курс', tmaUrl);

    const message = `
👋 Добро пожаловать в <b>Vibe Coding</b>!

🎯 <b>Бесплатный доступ:</b>
• День 0: Подготовка (90 мин)
• Библиотека промптов
• Шпаргалки и чек-листы

💎 <b>Полный курс (Дни 1-7):</b>
Разблокируйте доступ с помощью кодов, которые вы получите от преподавателя.

📱 Нажмите кнопку ниже, чтобы начать обучение!
    `.trim();

    await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
    });
}
