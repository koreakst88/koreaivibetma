// tma/public/js/prompts.js

let promptsData = [];

async function loadPrompts() {
    try {
        const response = await fetch('data/prompts.json');
        promptsData = await response.json();
        renderPrompts(promptsData);
    } catch (err) {
        console.error('Ошибка загрузки промптов:', err);
    }
}

// Объект для отслеживания состояния (свернуто/развернуто)
const promptStates = {};

// 1. Функция renderPrompts(prompts)
function renderPrompts(prompts) {
    const container = document.getElementById('prompts-container');
    container.innerHTML = ''; // Очистка перед рендерингом

    if (prompts.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10 text-gray-500">
                <div class="text-4xl mb-3">🔍</div>
                <p>Ничего не найдено.</p>
            </div>
        `;
        return;
    }

    prompts.forEach(promptItem => {
        // По умолчанию свернуто
        if (promptStates[promptItem.id] === undefined) {
            promptStates[promptItem.id] = false; // false = collapsed
        }
        const isExpanded = promptStates[promptItem.id];

        const card = document.createElement('div');
        // Tailwind стили карточки: bg-white rounded-lg shadow p-4 mb-4
        card.className = 'bg-white rounded-lg shadow-sm border border-gray-100 p-5 mb-4 transition-all hover:shadow-md';

        card.innerHTML = `
            <div class="flex justify-between items-start mb-3 border-b border-gray-100 pb-3">
                <div>
                    <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">ПРОМПТ #${promptItem.id}</span>
                    <h3 class="text-lg font-bold text-gray-800 mt-1">${promptItem.title}</h3>
                </div>
                <span class="bg-blue-50 text-blue-600 text-xs font-semibold px-2.5 py-1rounded-md whitespace-nowrap ml-3">
                    День ${promptItem.day.replace('day', '')}
                </span>
            </div>
            
            <div class="prompt-text mt-3 bg-gray-50 p-4 rounded-lg font-mono text-sm text-gray-700 whitespace-pre-wrap ${isExpanded ? '' : 'hidden'} border border-gray-200">${promptItem.prompt}</div>
            
            <div class="flex justify-between mt-4 gap-3">
                <button onclick="togglePrompt(${promptItem.id})" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm flex justify-center items-center">
                    ${isExpanded ? '▲ Свернуть' : '▼ Развернуть'}
                </button>
                <button onclick="copyPrompt(${promptItem.id})" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm shadow-sm flex justify-center items-center">
                    <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                    Копировать
                </button>
            </div>
        `;

        container.appendChild(card);
    });
}

// 2. Функция togglePrompt(promptId)
function togglePrompt(promptId) {
    promptStates[promptId] = !promptStates[promptId];
    // Перерисовываем с учетом текущего поиска
    searchPrompts();
}

// 3. Функция copyPrompt(promptId)
function copyPrompt(promptId) {
    const promptData = promptsData.find(p => p.id === promptId);
    if (!promptData) return;

    // Копирование в буфер обмена
    navigator.clipboard.writeText(promptData.prompt).then(() => {
        // Вибрация
        if (typeof vibrate === 'function') {
            vibrate('light');
        } else if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }

        showToast('✅ Промпт скопирован!');
    }).catch(err => {
        console.error('Ошибка копирования:', err);
        showToast('❌ Ошибка копирования');
    });
}

// 4. Функция searchPrompts()
function searchPrompts() {
    const searchInput = document.getElementById('search-prompts');
    const query = searchInput.value.toLowerCase().trim();

    if (!query) {
        renderPrompts(promptsData);
        return;
    }

    const filtered = promptsData.filter(p => {
        return p.title.toLowerCase().includes(query) ||
            p.id.toString() === query ||
            p.category.toLowerCase().includes(query);
    });

    renderPrompts(filtered);
}

// 5. Вспомогательная функция showToast (такая же как в app.js)
function showToast(message) {
    // Удаляем старый тост, если есть
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
    // Рендер изначальных данных
    loadPrompts();

    // Настройка кнопки назад
    if (typeof setupBackButton === 'function') {
        setupBackButton();
    }

    // Слушатель для поиска
    const searchInput = document.getElementById('search-prompts');
    if (searchInput) {
        searchInput.addEventListener('input', searchPrompts);
    }
});
