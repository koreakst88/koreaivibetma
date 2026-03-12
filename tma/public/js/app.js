// tma/public/js/app.js

// 1. Функция renderDays()
function renderDays() {
    const container = document.getElementById('days-container');
    if (!container) return;
    container.innerHTML = ''; // Очищаем контейнер перед рендерингом

    // Получаем прогресс, если функция доступна
    const progress = typeof getProgress === 'function' ? getProgress() : {};

    Object.entries(DAYS_CONFIG).forEach(([dayId, dayInfo]) => {
        const accessStatus = getDayAccessStatus(dayId);
        const isCompleted = progress[dayId]?.completed || false;

        const card = document.createElement('div');
        // Базовые tailwind стили для карточки
        card.className = `day-card bg-white rounded-lg shadow p-4 flex flex-col justify-between transition-all duration-300 hover:shadow-md ${accessStatus.locked ? 'opacity-90' : ''}`;

        let innerHTML = '';

        if (accessStatus.locked) {
            // Если locked: Иконка 🔒, Заголовок, Бейдж, Кнопка "Записаться на курс"
            innerHTML = `
                <div class="mb-4 text-center text-4xl">🔒</div>
                <div class="day-info text-center flex-grow flex flex-col items-center">
                    <h3 class="text-xl font-bold text-gray-800 mb-1">День ${dayInfo.order}: ${dayInfo.title}</h3>
                    <p class="text-sm text-gray-500 mb-3">${dayInfo.duration || ''}</p>
                    <span class="badge inline-block bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full mb-4 border border-gray-200">${accessStatus.badge || 'Для учеников курса'}</span>
                </div>
                <button onclick="showEnrollmentInfo()" class="btn-enroll w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm">
                    Записаться на курс
                </button>
                <div class="text-center mt-3">
                    <button onclick="promptUnlockCode('${dayId}')" class="text-xs text-blue-500 hover:text-blue-700 hover:underline">У меня есть код доступа</button>
                </div>
            `;
        } else if (accessStatus.reason === 'public') {
            // Если reason === 'public': Иконка 🎁, Заголовок, Бейдж "Бесплатно", Кнопка "Открыть бесплатно"
             innerHTML = `
                <div class="mb-4 text-center text-4xl transform hover:scale-110 transition-transform">🎁</div>
                <div class="day-info text-center flex-grow flex flex-col items-center">
                    <h3 class="text-xl font-bold text-gray-800 mb-1">День ${dayInfo.order}: ${dayInfo.title}</h3>
                    <p class="text-sm text-gray-500 mb-3">${dayInfo.duration || ''}</p>
                    <span class="badge inline-block bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4 shadow-sm">Бесплатно</span>
                </div>
                <a href="day.html?id=${dayId}" class="btn-open block w-full text-center bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm">
                    Открыть бесплатно
                </a>
            `;
        } else {
             // Если unlocked: Иконка 📖 (или ✅), Заголовок, Кнопка "Открыть"
             innerHTML = `
                <div class="mb-4 text-center text-4xl transform hover:scale-110 transition-transform">${isCompleted ? '✅' : '📖'}</div>
                <div class="day-info text-center flex-grow flex flex-col items-center">
                    <h3 class="text-xl font-bold text-gray-800 mb-1">День ${dayInfo.order}: ${dayInfo.title}</h3>
                    <p class="text-sm text-gray-500 mb-4">${dayInfo.duration || ''}</p>
                </div>
                <a href="day.html?id=${dayId}" class="btn-open block w-full text-center bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm">
                    Открыть
                </a>
            `;
        }

        card.innerHTML = innerHTML;
        container.appendChild(card);
    });

    // Обновляем прогресс-бар, если функция подключена
    if (typeof updateProgressBar === 'function') {
        updateProgressBar();
    }
}

// 2. Функция showEnrollmentInfo()
function showEnrollmentInfo() {
    // Если уже есть модалка, удаляем
    let existingModal = document.querySelector('.modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    // Tailwind классы для оверлея и центрирования
    modal.className = 'modal fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center tracking-wide z-[100] opacity-0 transition-opacity duration-300 px-4';
    
    modal.innerHTML = `
        <div class="modal-content bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl transform scale-95 transition-transform duration-300 max-h-[90vh] overflow-y-auto">
            <div class="text-center mb-5">
                <div class="text-4xl mb-3">📚</div>
                <h2 class="text-2xl font-bold text-gray-800">Полный курс для учеников</h2>
                <p class="text-gray-500 mt-2 text-sm">Дни 1-7 доступны после записи на курс.</p>
            </div>
            
            <div class="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-100">
                <h3 class="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wider">Что входит в полный курс:</h3>
                <ul class="text-gray-700 space-y-2 text-sm">
                    <li class="flex items-start"><span class="text-blue-500 mr-2">✓</span>7 индивидуальных встреч (60-90 минут)</li>
                    <li class="flex items-start"><span class="text-blue-500 mr-2">✓</span>Доступ ко всем материалам навсегда</li>
                    <li class="flex items-start"><span class="text-blue-500 mr-2">✓</span>Создание полноценного Telegram Mini App</li>
                    <li class="flex items-start"><span class="text-blue-500 mr-2">✓</span>Поддержка преподавателя</li>
                </ul>
            </div>
            
            <div class="modal-actions flex flex-col sm:flex-row gap-3">
                <button onclick="contactTeacher()" class="btn-primary flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors shadow-sm">
                    Записаться
                </button>
                <button onclick="closeModal()" class="btn-secondary flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-colors">
                    Закрыть
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Анимация появления
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('.modal-content').classList.remove('scale-95');
    }, 10);
    
    // Закрытие при клике на фон (опционально для удобства)
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

// 3. Функция closeModal()
function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.classList.add('opacity-0');
        const content = modal.querySelector('.modal-content');
        if (content) content.classList.add('scale-95');
        
        // Ждем окончания анимации
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// 4. Функция showToast(message)
function showToast(message) {
    const toast = document.createElement('div');
    // Tailwind классы для тоста
    toast.className = 'toast fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-5 py-3 rounded-lg shadow-xl opacity-0 transition-opacity duration-300 z-[200] text-sm font-medium flex items-center max-w-[90vw] text-center';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Показываем
    setTimeout(() => {
        toast.classList.remove('opacity-0');
    }, 50);
    
    // Скрываем через 3 секунды
    setTimeout(() => {
        toast.classList.add('opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 5. Функция promptUnlockCode(dayId)
function promptUnlockCode(dayId) {
    const code = prompt('Введите код из сообщения преподавателя:');
    if (code) {
        // Мы предполагаем, что unlockDay возвращает объект вида { success: true|false, message: "..." }
        const result = typeof unlockDay === 'function' ? unlockDay(code) : { success: false, message: 'Возникла ошибка модуля доступа.' };
        
        if (result && result.success) {
            showToast(`✅ ${result.message}`);
            renderDays(); // Перерисовать список
        } else {
            // Добавляем вибрацию при ошибке, если Telegram SDK подключен
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
            }
            showToast(`❌ ${result ? result.message : 'Неверный код'}`);
        }
    }
}

// 6. Инициализация
document.addEventListener('DOMContentLoaded', () => {
    // Предотвращаем сворачивание при скроллинге
    if (window.Telegram && window.Telegram.WebApp) {
        const tgApp = window.Telegram.WebApp;
        // Разворачиваем на весь экран
        tgApp.expand();
        // Отключаем вертикальные свайпы (Bot API 7.7+)
        if (typeof tgApp.disableVerticalSwipes === 'function') {
            tgApp.disableVerticalSwipes();
        }
        // Запрашиваем полноэкранный режим (Bot API 8.0+)
        if (typeof tgApp.requestFullscreen === 'function') {
            tgApp.requestFullscreen();
        }
    }

    // Инициализация аналитики
    try {
        const tgUser = (typeof Telegram !== 'undefined' && 
            Telegram.WebApp?.initDataUnsafe?.user) || null;
        
        if (typeof initAnalytics === 'function') {
            initAnalytics(tgUser);
        }
    } catch(e) {}

    // В случае если DAYS_CONFIG загрузился до app.js
    if (typeof DAYS_CONFIG !== 'undefined') {
        renderDays();
    } else {
        console.warn('Внимание: DAYS_CONFIG не определен. Убедитесь, что access.js подключен до app.js в HTML файле.');
    }
});
