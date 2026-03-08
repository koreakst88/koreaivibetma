/**
 * Модуль управления прогрессом курса
 * Отслеживает завершение дней и чек-листов
 */

// Ключ для хранения прогресса в LocalStorage
const PROGRESS_STORAGE_KEY = 'course_progress';

/**
 * Получить прогресс из LocalStorage
 * @returns {Object} Объект прогресса для всех дней
 */
function getProgress() {
    try {
        const stored = localStorage.getItem(PROGRESS_STORAGE_KEY);
        
        if (!stored) {
            console.log('Progress not found, initializing...');
            return initializeProgress();
        }

        const parsed = JSON.parse(stored);
        
        // Валидация структуры данных
        if (!parsed || typeof parsed !== 'object') {
            console.warn('Invalid progress format in storage, reinitializing');
            return initializeProgress();
        }

        // Проверка, что все дни из DAYS_CONFIG присутствуют
        const allDaysPresent = Object.keys(DAYS_CONFIG).every(dayId => {
            return parsed[dayId] && 
                   typeof parsed[dayId].completed === 'boolean' &&
                   Array.isArray(parsed[dayId].checklists);
        });

        if (!allDaysPresent) {
            console.warn('Progress structure incomplete, reinitializing');
            return initializeProgress();
        }

        return parsed;
    } catch (error) {
        console.error('Error reading progress from storage:', error);
        return initializeProgress();
    }
}

/**
 * Инициализировать структуру прогресса для всех дней
 * @returns {Object} Новый объект прогресса
 */
function initializeProgress() {
    try {
        const progress = {};
        
        // Создать структуру для каждого дня из DAYS_CONFIG
        Object.keys(DAYS_CONFIG).forEach(dayId => {
            progress[dayId] = {
                completed: false,
                checklists: []
            };
        });

        // Сохранить в LocalStorage
        const saved = saveProgress(progress);
        
        if (!saved) {
            console.error('Failed to save initialized progress');
        }

        console.log('Progress initialized for', Object.keys(progress).length, 'days');
        return progress;
    } catch (error) {
        console.error('Error initializing progress:', error);
        // Возвращаем пустой объект в случае критической ошибки
        return {};
    }
}

/**
 * Сохранить прогресс в LocalStorage с валидацией
 * @param {Object} progress - Объект прогресса для сохранения
 * @returns {boolean} Успешность операции
 */
function saveProgress(progress) {
    try {
        // Валидация входных данных
        if (!progress || typeof progress !== 'object') {
            console.error('saveProgress: progress must be an object');
            return false;
        }

        // Валидация структуры каждого дня
        for (const dayId in progress) {
            if (!DAYS_CONFIG[dayId]) {
                console.warn(`saveProgress: unknown day ID: ${dayId}, skipping`);
                continue;
            }

            const dayProgress = progress[dayId];
            
            if (typeof dayProgress.completed !== 'boolean') {
                console.error(`saveProgress: invalid completed value for ${dayId}`);
                return false;
            }

            if (!Array.isArray(dayProgress.checklists)) {
                console.error(`saveProgress: invalid checklists value for ${dayId}`);
                return false;
            }
        }

        localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
        return true;
    } catch (error) {
        console.error('Error saving progress to storage:', error);
        return false;
    }
}

/**
 * Отметить день как пройденный
 * @param {string} dayId - ID дня для отметки
 * @returns {boolean} Успешность операции
 */
function markDayCompleted(dayId) {
    try {
        // Проверка существования дня
        if (!DAYS_CONFIG[dayId]) {
            console.error(`markDayCompleted: unknown day ID: ${dayId}`);
            return false;
        }

        const progress = getProgress();
        
        if (!progress[dayId]) {
            console.error(`markDayCompleted: day ${dayId} not found in progress`);
            return false;
        }

        // Отметить день как завершенный
        progress[dayId].completed = true;

        // Сохранить прогресс
        const saved = saveProgress(progress);
        
        if (!saved) {
            console.error(`Failed to save progress for day ${dayId}`);
            return false;
        }

        console.log(`Day ${dayId} marked as completed`);

        // Обновить UI прогресс-бара
        updateProgressBar();

        return true;
    } catch (error) {
        console.error('Error marking day as completed:', error);
        return false;
    }
}

/**
 * Обновить статус чек-бокса в чек-листе
 * @param {string} dayId - ID дня
 * @param {number} checklistIndex - Индекс чек-бокса
 * @param {boolean} checked - Новое состояние чек-бокса
 * @returns {boolean} Успешность операции
 */
function updateChecklist(dayId, checklistIndex, checked) {
    try {
        // Валидация параметров
        if (!DAYS_CONFIG[dayId]) {
            console.error(`updateChecklist: unknown day ID: ${dayId}`);
            return false;
        }

        if (typeof checklistIndex !== 'number' || checklistIndex < 0) {
            console.error(`updateChecklist: invalid checklistIndex: ${checklistIndex}`);
            return false;
        }

        if (typeof checked !== 'boolean') {
            console.error(`updateChecklist: checked must be boolean`);
            return false;
        }

        const progress = getProgress();
        
        if (!progress[dayId]) {
            console.error(`updateChecklist: day ${dayId} not found in progress`);
            return false;
        }

        // Расширить массив чек-листов если необходимо
        while (progress[dayId].checklists.length <= checklistIndex) {
            progress[dayId].checklists.push(false);
        }

        // Обновить состояние чек-бокса
        progress[dayId].checklists[checklistIndex] = checked;

        // Сохранить прогресс
        const saved = saveProgress(progress);
        
        if (!saved) {
            console.error(`Failed to save checklist update for day ${dayId}`);
            return false;
        }

        console.log(`Checklist ${checklistIndex} for day ${dayId} updated to ${checked}`);

        // Проверить, все ли чек-боксы отмечены
        const allChecked = progress[dayId].checklists.every(item => item === true);
        
        if (allChecked && progress[dayId].checklists.length > 0 && !progress[dayId].completed) {
            console.log(`All checklists completed for day ${dayId}`);
            // Можно автоматически отметить день как завершенный
            // markDayCompleted(dayId);
        }

        return true;
    } catch (error) {
        console.error('Error updating checklist:', error);
        return false;
    }
}

/**
 * Получить общий прогресс по курсу
 * @returns {Object} Объект с информацией о прогрессе {completed, total, percentage}
 */
function getTotalProgress() {
    try {
        const progress = getProgress();
        const totalDays = Object.keys(DAYS_CONFIG).length;
        
        if (totalDays === 0) {
            return {
                completed: 0,
                total: 0,
                percentage: 0
            };
        }

        const completedDays = Object.keys(progress).filter(dayId => {
            return progress[dayId] && progress[dayId].completed === true;
        }).length;

        const percentage = Math.round((completedDays / totalDays) * 100);

        return {
            completed: completedDays,
            total: totalDays,
            percentage: percentage
        };
    } catch (error) {
        console.error('Error calculating total progress:', error);
        return {
            completed: 0,
            total: Object.keys(DAYS_CONFIG).length,
            percentage: 0
        };
    }
}

/**
 * Обновить прогресс-бар на главной странице
 * Обновляет элементы #progress-text и #progress-fill
 */
function updateProgressBar() {
    try {
        const progressData = getTotalProgress();
        
        // Обновить текст прогресса
        const progressText = document.getElementById('progress-text');
        if (progressText) {
            progressText.textContent = `${progressData.completed}/${progressData.total} дней пройдено`;
        }

        // Обновить заполнение прогресс-бара
        const progressFill = document.getElementById('progress-fill');
        if (progressFill) {
            progressFill.style.width = `${progressData.percentage}%`;
        }

        console.log(`Progress bar updated: ${progressData.percentage}%`);
    } catch (error) {
        console.error('Error updating progress bar:', error);
    }
}

/**
 * Обработать чек-листы на странице дня
 * Находит все чек-боксы, восстанавливает их состояние и добавляет обработчики
 * @param {string} dayId - ID текущего дня
 */
function processChecklists(dayId) {
    try {
        // Проверка существования дня
        if (!DAYS_CONFIG[dayId]) {
            console.error(`processChecklists: unknown day ID: ${dayId}`);
            return;
        }

        const progress = getProgress();
        
        if (!progress[dayId]) {
            console.error(`processChecklists: day ${dayId} not found in progress`);
            return;
        }

        // Найти все чек-боксы на странице
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        
        if (checkboxes.length === 0) {
            console.log(`No checkboxes found for day ${dayId}`);
            return;
        }

        console.log(`Processing ${checkboxes.length} checkboxes for day ${dayId}`);

        // Обработать каждый чек-бокс
        checkboxes.forEach((checkbox, index) => {
            // Восстановить состояние из прогресса
            if (progress[dayId].checklists[index] === true) {
                checkbox.checked = true;
            }

            // Добавить обработчик изменения
            checkbox.addEventListener('change', function(event) {
                const isChecked = event.target.checked;
                updateChecklist(dayId, index, isChecked);
                
                console.log(`Checkbox ${index} for day ${dayId} changed to ${isChecked}`);
            });
        });

        console.log(`Checklists processed for day ${dayId}`);
    } catch (error) {
        console.error('Error processing checklists:', error);
    }
}

/**
 * Получить прогресс конкретного дня
 * @param {string} dayId - ID дня
 * @returns {Object|null} Объект прогресса дня или null
 */
function getDayProgress(dayId) {
    try {
        if (!DAYS_CONFIG[dayId]) {
            console.error(`getDayProgress: unknown day ID: ${dayId}`);
            return null;
        }

        const progress = getProgress();
        return progress[dayId] || null;
    } catch (error) {
        console.error('Error getting day progress:', error);
        return null;
    }
}

/**
 * Сбросить прогресс (для отладки)
 * @returns {boolean} Успешность операции
 */
function resetProgress() {
    try {
        localStorage.removeItem(PROGRESS_STORAGE_KEY);
        console.log('Progress has been reset');
        
        // Переинициализировать
        initializeProgress();
        
        // Обновить UI
        updateProgressBar();
        
        return true;
    } catch (error) {
        console.error('Error resetting progress:', error);
        return false;
    }
}

/**
 * Получить статистику по чек-листам дня
 * @param {string} dayId - ID дня
 * @returns {Object} Статистика {total, completed, percentage}
 */
function getDayChecklistStats(dayId) {
    try {
        if (!DAYS_CONFIG[dayId]) {
            console.error(`getDayChecklistStats: unknown day ID: ${dayId}`);
            return { total: 0, completed: 0, percentage: 0 };
        }

        const progress = getProgress();
        
        if (!progress[dayId]) {
            return { total: 0, completed: 0, percentage: 0 };
        }

        const checklists = progress[dayId].checklists;
        const total = checklists.length;
        const completed = checklists.filter(item => item === true).length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
            total: total,
            completed: completed,
            percentage: percentage
        };
    } catch (error) {
        console.error('Error getting day checklist stats:', error);
        return { total: 0, completed: 0, percentage: 0 };
    }
}

// Инициализация при загрузке страницы
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        // Убедиться, что прогресс инициализирован
        getProgress();
        
        // Обновить прогресс-бар если элементы присутствуют
        if (document.getElementById('progress-text') || document.getElementById('progress-fill')) {
            updateProgressBar();
        }
    });
}

// Экспорт функций для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getProgress,
        initializeProgress,
        saveProgress,
        markDayCompleted,
        updateChecklist,
        getTotalProgress,
        updateProgressBar,
        processChecklists,
        getDayProgress,
        getDayChecklistStats,
        resetProgress
    };
}
