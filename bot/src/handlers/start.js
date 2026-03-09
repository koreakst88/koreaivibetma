import { InlineKeyboard } from 'grammy';
import { trackBotStart } from '../utils/analytics.js';

export async function handleStart(ctx) {
    await trackBotStart(ctx.from.id, ctx.from.username);
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
