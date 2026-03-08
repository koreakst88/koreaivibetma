# Vibe Coding Bot

Telegram бот для курса "Vibe Coding" на базе Grammy.

## Установка

1. Установите зависимости:
```bash
cd bot
npm install
```

2. Создайте файл `.env` на основе `.env.example`:
```bash
cp .env.example .env
```

3. Заполните `.env` файл:
```env
BOT_TOKEN=your_bot_token_from_botfather
TMA_URL=https://your-course.vercel.app
```

## Запуск

### Продакшн
```bash
npm start
```

### Разработка (с автоперезагрузкой)
```bash
npm run dev
```

## Команды бота

- `/start` - Приветствие и открытие курса
- `/help` - Справка по использованию
- `/unlock` - Инструкция по разблокировке
- `/enroll` - Информация о полном курсе

## Коды разблокировки

Коды настраиваются в файле `src/config/codes.js`:

- `DAY0` → day-0 (Подготовка)
- `DAY1` → day-1 (Vibe Coding)
- `DAY2` → day-2 (Архитектура TMA)
- `DAY3` → day-3 (Корзина и формы)
- `DAY4` → day-4 (Интеграция с Telegram)
- `DAY5` → day-5 (Платежи и API)
- `DAY6` → day-6 (Автоматизация)
- `DAY7` → day-7 (Аналитика и финал)

## Структура проекта

```
bot/
├── src/
│   ├── index.js           # Главный файл бота
│   ├── config/
│   │   └── codes.js       # Коды разблокировки
│   └── handlers/
│       ├── start.js       # Обработчик /start
│       └── unlock.js      # Обработчик разблокировки
├── .env                   # Переменные окружения (не в git)
├── .env.example           # Пример .env
├── package.json
└── README.md
```

## Как работает разблокировка

1. Пользователь отправляет код (например: `DAY1`)
2. Бот проверяет код в `UNLOCK_CODES`
3. Если код верный, бот отправляет кнопку WebApp с URL: `{TMA_URL}?unlock=DAY1`
4. При открытии WebApp, код автоматически разблокирует день в приложении

## Разработка

Для добавления новых команд:

1. Создайте handler в `src/handlers/`
2. Импортируйте и зарегистрируйте в `src/index.js`

Для изменения кодов разблокировки:

1. Отредактируйте `src/config/codes.js`
2. Убедитесь, что коды совпадают с `tma/public/js/access.js`
