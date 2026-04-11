/**
 * Модуль управления прогрессом курса
 * Использует Supabase с fallback на LocalStorage
 */

const PROGRESS_STORAGE_KEY = 'course_progress';

function getProgressTelegramUserId() {
    return (
        window.currentTelegramUserId ||
        window.Telegram?.WebApp?.initDataUnsafe?.user?.id ||
        null
    );
}

function createEmptyProgress() {
    const progress = {};

    Object.keys(DAYS_CONFIG).forEach(dayId => {
        progress[dayId] = {
            completed: false,
            checklists: [],
            status: 'not_started',
            last_step: null
        };
    });

    return progress;
}

function normalizeProgressObject(rawProgress) {
    const progress = createEmptyProgress();

    if (!rawProgress || typeof rawProgress !== 'object') {
        return progress;
    }

    Object.keys(progress).forEach(dayId => {
        const dayProgress = rawProgress[dayId];

        if (!dayProgress || typeof dayProgress !== 'object') {
            return;
        }

        const checklists = Array.isArray(dayProgress.checklists) ? dayProgress.checklists : [];
        const completed = dayProgress.completed === true;
        const status = dayProgress.status || (completed ? 'completed' : (checklists.length > 0 ? 'in_progress' : 'not_started'));

        progress[dayId] = {
            completed,
            checklists,
            status,
            last_step: dayProgress.last_step ?? null
        };
    });

    return progress;
}

function readLocalProgress() {
    try {
        const stored = localStorage.getItem(PROGRESS_STORAGE_KEY);
        if (!stored) {
            return null;
        }

        return normalizeProgressObject(JSON.parse(stored));
    } catch (error) {
        console.error('Error reading progress from storage:', error);
        return null;
    }
}

function writeLocalProgress(progress) {
    try {
        localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
        return true;
    } catch (error) {
        console.error('Error saving progress to storage:', error);
        return false;
    }
}

function mapSupabaseRowsToProgress(rows) {
    const progress = createEmptyProgress();

    if (!Array.isArray(rows)) {
        return progress;
    }

    rows.forEach(row => {
        const dayId = `day-${row.day_number}`;
        if (!progress[dayId]) {
            return;
        }

        const checklists = Array.isArray(row.checklist_json) ? row.checklist_json : [];
        const status = row.status || (checklists.length > 0 ? 'in_progress' : 'not_started');

        progress[dayId] = {
            completed: status === 'completed',
            checklists,
            status,
            last_step: row.last_step ?? null
        };
    });

    return progress;
}

function updateCachedSupabaseProgress(dayId, dayProgress) {
    const dayNumber = DAYS_CONFIG[dayId]?.order;
    if (!Number.isFinite(dayNumber) || dayNumber <= 0) {
        return;
    }

    if (!Array.isArray(window.userProgress)) {
        window.userProgress = [];
    }

    const row = {
        day_number: dayNumber,
        status: dayProgress.status,
        checklist_json: dayProgress.checklists,
        last_step: dayProgress.last_step
    };

    const existingIndex = window.userProgress.findIndex(item => item.day_number === dayNumber);
    if (existingIndex >= 0) {
        window.userProgress[existingIndex] = row;
    } else {
        window.userProgress.push(row);
    }
}

async function initializeProgress() {
    const progress = createEmptyProgress();
    writeLocalProgress(progress);
    return progress;
}

async function getProgress() {
    const telegramUserId = getProgressTelegramUserId();
    const localProgress = readLocalProgress();

    if (!telegramUserId || !window.supabaseStore?.getProgress) {
        return localProgress || initializeProgress();
    }

    try {
        const rows = Array.isArray(window.userProgress)
            ? window.userProgress
            : await window.supabaseStore.getProgress(telegramUserId);

        if (Array.isArray(rows)) {
            window.userProgress = rows;
            const supabaseProgress = mapSupabaseRowsToProgress(rows);
            writeLocalProgress(supabaseProgress);
            return supabaseProgress;
        }
    } catch (error) {
        console.error('Error loading progress from Supabase:', error);
    }

    return localProgress || initializeProgress();
}

async function saveProgress(progress, changedDayId = null) {
    try {
        const normalizedProgress = normalizeProgressObject(progress);
        const localSaved = writeLocalProgress(normalizedProgress);

        if (!localSaved) {
            return false;
        }

        const telegramUserId = getProgressTelegramUserId();
        if (!telegramUserId || !window.supabaseStore?.saveProgress) {
            return true;
        }

        const dayIdsToSync = changedDayId
            ? [changedDayId]
            : Object.keys(normalizedProgress).filter(dayId => {
                return DAYS_CONFIG[dayId]?.order > 0 && (
                    normalizedProgress[dayId].completed ||
                    normalizedProgress[dayId].checklists.length > 0 ||
                    normalizedProgress[dayId].last_step !== null
                );
            });

        await Promise.all(dayIdsToSync.map(async (dayId) => {
            const dayNumber = DAYS_CONFIG[dayId]?.order;
            if (!Number.isFinite(dayNumber) || dayNumber <= 0) {
                return;
            }

            const dayProgress = normalizedProgress[dayId];

            await window.supabaseStore.saveProgress(telegramUserId, dayNumber, {
                status: dayProgress.status,
                last_step: dayProgress.last_step,
                checklist_json: dayProgress.checklists
            });

            updateCachedSupabaseProgress(dayId, dayProgress);
        }));

        return true;
    } catch (error) {
        console.error('Error saving progress:', error);
        return false;
    }
}

async function markDayCompleted(dayId) {
    try {
        if (!DAYS_CONFIG[dayId]) {
            return false;
        }

        const progress = await getProgress();
        if (!progress[dayId]) {
            return false;
        }

        progress[dayId].completed = true;
        progress[dayId].status = 'completed';

        const saved = await saveProgress(progress, dayId);
        if (!saved) {
            return false;
        }

        await updateProgressBar();
        return true;
    } catch (error) {
        console.error('Error marking day as completed:', error);
        return false;
    }
}

async function updateChecklist(dayId, checklistIndex, checked) {
    try {
        if (!DAYS_CONFIG[dayId]) {
            return false;
        }

        const index = Number(checklistIndex);
        if (!Number.isFinite(index) || index < 0 || typeof checked !== 'boolean') {
            return false;
        }

        const progress = await getProgress();
        if (!progress[dayId]) {
            return false;
        }

        while (progress[dayId].checklists.length <= index) {
            progress[dayId].checklists.push(false);
        }

        progress[dayId].checklists[index] = checked;
        progress[dayId].status = progress[dayId].completed
            ? 'completed'
            : (progress[dayId].checklists.length > 0 ? 'in_progress' : 'not_started');

        return await saveProgress(progress, dayId);
    } catch (error) {
        console.error('Error updating checklist:', error);
        return false;
    }
}

async function getTotalProgress() {
    try {
        const progress = await getProgress();
        const courseDayIds = Object.keys(DAYS_CONFIG).filter(dayId => DAYS_CONFIG[dayId]?.order > 0);
        const totalDays = courseDayIds.length;

        if (totalDays === 0) {
            return { completed: 0, total: 0, percentage: 0 };
        }

        const completedDays = courseDayIds.filter(dayId => progress[dayId]?.completed === true).length;
        const percentage = Math.round((completedDays / totalDays) * 100);

        return {
            completed: completedDays,
            total: totalDays,
            percentage
        };
    } catch (error) {
        console.error('Error calculating total progress:', error);
        return {
            completed: 0,
            total: Object.keys(DAYS_CONFIG).filter(dayId => DAYS_CONFIG[dayId]?.order > 0).length,
            percentage: 0
        };
    }
}

async function updateProgressBar() {
    try {
        const progressData = await getTotalProgress();

        const progressText = document.getElementById('progress-text');
        if (progressText) {
            progressText.textContent = `${progressData.percentage}% завершено`;
        }

        const progressDays = document.getElementById('progress-days');
        if (progressDays) {
            progressDays.textContent = String(progressData.completed);
        }

        const progressFill = document.getElementById('progress-fill');
        if (progressFill) {
            progressFill.style.width = `${progressData.percentage}%`;
        }
    } catch (error) {
        console.error('Error updating progress bar:', error);
    }
}

async function processChecklists(dayId) {
    try {
        if (!DAYS_CONFIG[dayId]) {
            return;
        }

        const progress = await getProgress();
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');

        checkboxes.forEach((checkbox, index) => {
            if (progress[dayId]?.checklists[index] === true) {
                checkbox.checked = true;
            }

            checkbox.addEventListener('change', async (event) => {
                await updateChecklist(dayId, index, event.target.checked);
            });
        });
    } catch (error) {
        console.error('Error processing checklists:', error);
    }
}

async function getDayProgress(dayId) {
    try {
        if (!DAYS_CONFIG[dayId]) {
            return null;
        }

        const progress = await getProgress();
        return progress[dayId] || null;
    } catch (error) {
        console.error('Error getting day progress:', error);
        return null;
    }
}

async function resetProgress() {
    try {
        localStorage.removeItem(PROGRESS_STORAGE_KEY);
        window.userProgress = [];
        await initializeProgress();
        await updateProgressBar();
        return true;
    } catch (error) {
        console.error('Error resetting progress:', error);
        return false;
    }
}

async function getDayChecklistStats(dayId) {
    try {
        if (!DAYS_CONFIG[dayId]) {
            return { total: 0, completed: 0, percentage: 0 };
        }

        const progress = await getDayProgress(dayId);
        if (!progress) {
            return { total: 0, completed: 0, percentage: 0 };
        }

        const checklists = Array.isArray(progress.checklists) ? progress.checklists : [];
        const total = checklists.length;
        const completed = checklists.filter(item => item === true).length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        return { total, completed, percentage };
    } catch (error) {
        console.error('Error getting day checklist stats:', error);
        return { total: 0, completed: 0, percentage: 0 };
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', async () => {
        await getProgress();

        if (document.getElementById('progress-text') || document.getElementById('progress-fill')) {
            await updateProgressBar();
        }
    });
}

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
