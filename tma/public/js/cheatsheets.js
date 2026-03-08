// tma/public/js/cheatsheets.js

let cheatsheetsData = {};

async function loadCheatsheets() {
    try {
        const response = await fetch('data/cheatsheets.json');
        cheatsheetsData = await response.json();
        switchTab('terminal');
    } catch (err) {
        console.error('Ошибка загрузки шпаргалок:', err);
    }
}

// Текущий активный таб
let currentTab = 'terminal';

// 1. Функция switchTab(tabName)
function switchTab(tabName) {
    if (!cheatsheetsData[tabName]) return;

    currentTab = tabName;

    // Обновляем классы для табов (активный/неактивный)
    const allTabs = document.querySelectorAll('.tab-btn');
    allTabs.forEach(tab => {
        // Сброс всех табов
        tab.className = 'tab-btn inline-block px-5 py-2.5 bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg shadow-sm whitespace-nowrap transition-colors';
    });

    // Устанавливаем стили для активного
    const activeTabButton = document.getElementById(`tab-${tabName}`);
    if (activeTabButton) {
        activeTabButton.className = 'tab-btn inline-block px-5 py-2.5 bg-blue-500 text-white rounded-lg shadow-sm whitespace-nowrap transition-colors';
    }

    // Рендерим контент
    renderCheatsheet(tabName);

    // Легкая вибрация при переключении
    if (typeof vibrate === 'function') vibrate('light');
}

// 2. Функция renderCheatsheet(tabName)
function renderCheatsheet(tabName) {
    const container = document.getElementById('cheatsheets-container');
    const data = cheatsheetsData[tabName];

    if (!data) return;

    // Очищаем
    container.innerHTML = '';

    const sectionTitle = document.createElement('h2');
    sectionTitle.className = 'text-xl font-bold text-gray-800 mb-4 px-1';
    sectionTitle.textContent = data.title;
    container.appendChild(sectionTitle);

    // Сценарий 1: Рендеринг ссылок (links)
    if (tabName === 'links') {
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-3';

        data.items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'bg-white rounded-xl shadow-sm border border-gray-100 p-4 transition-all hover:shadow-md flex justify-between items-center';
            card.innerHTML = `
                <div class="overflow-hidden pr-3">
                    <h3 class="font-bold text-gray-800 text-lg whitespace-nowrap overflow-hidden text-ellipsis">${item.name}</h3>
                    <p class="text-xs text-gray-500 mt-1">${item.description}</p>
                </div>
                <button onclick="openLink('${item.url}')" class="bg-gray-100 text-blue-600 hover:bg-blue-50 hover:text-blue-700 px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex-shrink-0">
                    Открыть
                </button>
            `;
            grid.appendChild(card);
        });

        container.appendChild(grid);
    }
    // Сценарий 2: Рендеринг команд (terminal, git)
    else {
        // Контейнер с обводкой для красивой таблицы
        const listWrapper = document.createElement('div');
        listWrapper.className = 'bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden';

        const ul = document.createElement('ul');
        ul.className = 'divide-y divide-gray-100';

        data.items.forEach((item, index) => {
            // Экранируем одинарные кавычки в команде, чтобы они не ломали onclick=""
            const safeCommand = item.example.replace(/'/g, "\\'");

            const li = document.createElement('li');
            li.className = 'p-4 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3';
            li.innerHTML = `
                <div class="flex-grow">
                    <div class="flex flex-col mb-1">
                        <span class="text-sm text-gray-500 mb-1">${item.description}</span>
                        <code class="text-sm font-mono text-pink-600 bg-pink-50 px-2.5 py-1 rounded inline-block w-max border border-pink-100">${item.command}</code>
                    </div>
                </div>
                <button onclick="copyCommand('${safeCommand}')" class="bg-gray-100 text-gray-700 hover:bg-blue-500 hover:text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center sm:w-auto w-full group">
                    <svg class="w-4 h-4 mr-1.5 text-gray-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                    Скопировать
                </button>
            `;
            ul.appendChild(li);
        });

        listWrapper.appendChild(ul);
        container.appendChild(listWrapper);
    }
}

// 3. Функция copyCommand(command)
function copyCommand(command) {
    navigator.clipboard.writeText(command).then(() => {
        if (typeof vibrate === 'function') vibrate('light');
        showToast('✅ Команда скопирована!');
    }).catch(err => {
        console.error('Ошибка:', err);
        showToast('❌ Ошибка копирования');
    });
}

// 4. Функция openLink(url)
function openLink(url) {
    if (typeof vibrate === 'function') vibrate('light');

    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.openLink) {
        // Открытие с помощью нативного браузера внутри Telegram
        window.Telegram.WebApp.openLink(url);
    } else {
        // Фолбэк для обычных браузеров
        window.open(url, '_blank');
    }
}

// 5. Вспомогательная функция showToast (идентично app.js и prompts.js)
function showToast(message) {
    const oldToast = document.querySelector('.toast');
    if (oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-5 py-3 rounded-lg shadow-xl opacity-0 transition-opacity duration-300 z-[200] text-sm font-medium flex items-center max-w-[90vw] text-center';
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => { toast.classList.remove('opacity-0'); }, 50);
    setTimeout(() => {
        toast.classList.add('opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// 6. Возврат на главную
function goBack() {
    window.location.href = 'index.html';
}

// 7. Инициализация
document.addEventListener('DOMContentLoaded', () => {
    // Загружаем данные и включаем первую вкладку
    loadCheatsheets();

    // Настраиваем кнопку "Назад" в Telegram
    if (typeof setupBackButton === 'function') setupBackButton();
});
