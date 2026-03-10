import { Bot } from 'grammy';
import dotenv from 'dotenv';
import { handleStart } from './handlers/start.js';
import { handleUnlockCommand, handleUnlockCode } from './handlers/unlock.js';
import { trackEnrollmentInterest } from './utils/analytics.js';
import { trackEvent, setUserProperties } from './utils/amplitude.js';

// Загрузка переменных окружения
dotenv.config();

// Проверка наличия токена
if (!process.env.BOT_TOKEN) {
    console.error('❌ Ошибка: BOT_TOKEN не найден в .env файле');
    process.exit(1);
}

if (!process.env.TMA_URL) {
    console.error('❌ Ошибка: TMA_URL не найден в .env файле');
    process.exit(1);
}

// Создание бота
const bot = new Bot(process.env.BOT_TOKEN);

// Команда /start
bot.command('start', handleStart);

// Команда /help
bot.command('help', async (ctx) => {
    const message = `
📚 <b>Как пользоваться ботом</b>

<b>Команды:</b>
/start - Открыть курс
/unlock - Разблокировать день по коду
/enroll - Информация о полном курсе
/help - Показать эту справку

<b>Разблокировка дней:</b>
1. Получите код от преподавателя
2. Отправьте код боту (например: DAY1)
3. Нажмите кнопку для открытия урока

<b>Бесплатный доступ:</b>
• День 0: Подготовка
• Библиотека промптов
• Шпаргалки и чек-листы

Просто нажмите /start чтобы начать! 🚀
    `.trim();

    await ctx.reply(message, { parse_mode: 'HTML' });
});

// Команда /unlock
bot.command('unlock', handleUnlockCommand);

// Команда /enroll
bot.command('enroll', async (ctx) => {
    // Отслеживаем интерес к записи
    await trackEnrollmentInterest(ctx.from.id);
    setUserProperties(ctx.from.id, {
        username: ctx.from.username,
        first_name: ctx.from.first_name,
        language_code: ctx.from.language_code
    });
    trackEvent(ctx.from.id, 'enrollment_interest');

    const message = `
💎 <b>Полный курс "Vibe Coding"</b>

<b>Программа курса (Дни 1-7):</b>

📅 День 1: Vibe Coding (60 мин)
📅 День 2: Архитектура TMA (60 мин)
📅 День 3: Корзина и формы (90 мин)
📅 День 4: Интеграция с Telegram (75 мин)
📅 День 5: Платежи и API (60 мин)
📅 День 6: Автоматизация (75 мин)
📅 День 7: Аналитика и финал (60 мин)

<b>Что вы получите:</b>
✅ Пошаговые уроки с практикой
✅ Готовые шаблоны и промпты
✅ Поддержка преподавателя
✅ Доступ к материалам навсегда

📞 <b>Для записи на курс:</b>
Свяжитесь с преподавателем для получения доступа и кодов разблокировки.

🎁 День 0 доступен бесплатно - нажмите /start
    `.trim();

    await ctx.reply(message, { parse_mode: 'HTML' });
});

// Обработка текстовых сообщений (коды разблокировки)
bot.on('message:text', async (ctx) => {
    // Игнорируем команды (они обрабатываются отдельно)
    if (ctx.message.text.startsWith('/')) {
        return;
    }

    // Обрабатываем как код разблокировки
    await handleUnlockCode(ctx);
});

// Обработка данных от WebApp (если кнопка отправляет web_app_data)
bot.on('message:web_app_data', async (ctx) => {
    setUserProperties(ctx.from.id, {
        username: ctx.from.username,
        first_name: ctx.from.first_name,
        language_code: ctx.from.language_code
    });
    trackEvent(ctx.from.id, 'tma_opened');
});

// Обработка ошибок
bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Ошибка при обработке обновления ${ctx.update.update_id}:`);
    const e = err.error;

    if (e instanceof Error) {
        console.error('Ошибка:', e.message);
        console.error('Stack:', e.stack);
    } else {
        console.error('Неизвестная ошибка:', e);
    }
});

// Запуск бота
console.log('🤖 Запуск бота...');
bot.start({
    onStart: (botInfo) => {
        console.log(`✅ Бот @${botInfo.username} успешно запущен!`);
        console.log(`📱 TMA URL: ${process.env.TMA_URL}`);
    }
});

// Graceful shutdown
process.once('SIGINT', () => {
    console.log('\n⏹ Остановка бота...');
    bot.stop();
});

process.once('SIGTERM', () => {
    console.log('\n⏹ Остановка бота...');
    bot.stop();
});
