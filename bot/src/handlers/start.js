import { InlineKeyboard } from 'grammy';
import { trackBotStart } from '../utils/analytics.js';
import { trackEvent, setUserProperties } from '../utils/amplitude.js';
import { registerUser } from '../utils/onboarding.js';

function appendEntryParam(url, entry) {
    try {
        const nextUrl = new URL(url);
        nextUrl.searchParams.set('entry', entry);
        return nextUrl.toString();
    } catch (error) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}entry=${encodeURIComponent(entry)}`;
    }
}

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
    const quizUrl = appendEntryParam(tmaUrl, 'quiz');
    const pricingUrl = appendEntryParam(tmaUrl, 'pricing');

    const keyboard = new InlineKeyboard()
        .webApp('Подобрать формат', quizUrl)
        .row()
        .webApp('Посмотреть тарифы', pricingUrl);

    const message = `
Ты здесь потому что хочешь делать продукты через AI — но пока не ясно как это работает на практике именно под твою задачу. Сейчас разберёмся 👋

🎁 Бесплатно уже доступно:
- Вводный урок
- Библиотека промптов и шпаргалки

Выбери с чего начать:
    `.trim();

    await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
    });
}
