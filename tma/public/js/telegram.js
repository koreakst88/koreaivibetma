// tma/public/js/telegram.js

// 1. Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;

// Разворачиваем приложение на весь экран телефона и сообщаем, что готовы работать
tg.ready();
tg.expand();

// 2. Функция applyTelegramTheme()
// Применяем цвета из Telegram к нашему приложению
function applyTelegramTheme() {
    const isDark = tg.colorScheme === 'dark';

    // Добавляем или убираем класс 'dark-theme'
    if (isDark) {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }

    // Устанавливаем CSS переменные из параметров темы (или дефолтные значения)
    const root = document.documentElement;
    root.style.setProperty('--tg-bg', tg.themeParams.bg_color || '#ffffff');
    root.style.setProperty('--tg-text', tg.themeParams.text_color || '#000000');
    root.style.setProperty('--tg-button', tg.themeParams.button_color || '#3390ec');
    root.style.setProperty('--tg-button-text', tg.themeParams.button_text_color || '#ffffff');
}

// 3. Функция setupBackButton()
// Показываем кнопку "Назад" в шапке Telegram и обрабатываем клик
function setupBackButton() {
    tg.BackButton.show();
    tg.BackButton.onClick(() => {
        // Мы уже на index.html не должны её показывать, 
        // но здесь она настроена для работы на внутренних страницах
        window.location.href = 'index.html';
    });
}

// 4. Функция contactTeacher()
// Открывает диалог с преподавателем в самом Telegram
function contactTeacher() {
    const teacherUsername = 'koreakim88'; // Замените на реальный юзернейм преподавателя
    const message = 'Здравствуйте! У меня вопрос по курсу:';

    // Формируем URL с текстом сообщения и открываем через API Telegram
    tg.openTelegramLink(`https://t.me/${teacherUsername}?text=${encodeURIComponent(message)}`);
}

// 5. Функция vibrate(type) 
// Создает тактильный отклик (вибрацию) при нажатиях
function vibrate(type = 'light') {
    // Типы могут быть: 'light', 'medium', 'heavy', 'rigid', 'soft'
    tg.HapticFeedback.impactOccurred(type);
}

// 6. Автоматический вызов при загрузке
applyTelegramTheme();

// Также подписываемся на события изменения темы пользователем в самом Telegram, 
// чтобы всё менялось мгновенно
tg.onEvent('themeChanged', applyTelegramTheme);
