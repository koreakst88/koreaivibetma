import { InlineKeyboard } from 'grammy';
import { UNLOCK_CODES, DAYS_INFO } from '../config/codes.js';
import { trackCodeEntered } from '../utils/analytics.js';
import { trackEvent } from '../utils/amplitude.js';

export async function handleUnlockCommand(ctx) {
    const message = `
🔓 <b>Разблокировка дня курса</b>

Чтобы разблокировать день, отправьте код доступа, который вы получили от преподавателя.

<b>Формат кода:</b> DAY1, DAY2, DAY3 и т.д.

Просто отправьте код следующим сообщением.
    `.trim();

    await ctx.reply(message, { parse_mode: 'HTML' });
}

export async function handleUnlockCode(ctx) {
    const code = ctx.message.text.trim().toUpperCase();
    const tmaUrl = process.env.TMA_URL;

    // Проверка кода в UNLOCK_CODES
    if (!UNLOCK_CODES[code]) {
        // Track failed attempt if needed, or just success false. But prompt asks to track code_entered with code text
        trackEvent(ctx.from.id, 'code_entered', {
            code: code,
            success: false
        });

        await ctx.reply(
            '❌ Неверный код разблокировки.\n\n' +
            'Проверьте правильность кода и попробуйте снова.\n' +
            'Формат: DAY1, DAY2, DAY3 и т.д.',
            { parse_mode: 'HTML' }
        );
        return;
    }

    const dayId = UNLOCK_CODES[code];
    const dayInfo = DAYS_INFO[dayId];

    if (!dayInfo) {
        await ctx.reply('❌ Ошибка конфигурации кода. Обратитесь к преподавателю.');
        return;
    }

    // Отслеживаем разблокировку
    await trackCodeEntered(ctx.from.id, code, dayId);
    trackEvent(ctx.from.id, 'code_entered', {
        code: code,
        day: dayId,
        success: true
    });

    // Создание кнопки с параметром unlock
    const unlockUrl = `${tmaUrl}?unlock=${code}`;
    const keyboard = new InlineKeyboard()
        .webApp('🎓 Открыть урок', unlockUrl);

    const message = `
✅ <b>Код принят!</b>

🎯 Разблокирован: <b>${dayInfo.title}</b>
⏱ Длительность: ${dayInfo.duration}

Нажмите кнопку ниже, чтобы открыть урок и начать обучение!
    `.trim();

    await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
    });
}
