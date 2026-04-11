// tma/public/js/supabase.js

(function () {
    const SUPABASE_URL = 'https://cluhxpqlemybckvgvkmz.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsdWh4cHFsZW15YmNrdmd2a216Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4OTM3NDcsImV4cCI6MjA5MTQ2OTc0N30.8fSUqP1TROZsV8wACdLtV1oGQV4x9FIHQSeQKA7B9Eg';

    let supabaseClient = null;
    const resolvedUserIds = new Map();

    function hasValidConfig() {
        return Boolean(
            SUPABASE_URL &&
            SUPABASE_ANON_KEY &&
            !SUPABASE_URL.includes('YOUR_SUPABASE_URL') &&
            !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY')
        );
    }

    function getClient() {
        if (supabaseClient) {
            return supabaseClient;
        }

        if (!hasValidConfig() || !window.supabase || typeof window.supabase.createClient !== 'function') {
            return null;
        }

        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return supabaseClient;
    }

    async function resolveUserId(telegramUserId) {
        if (!telegramUserId) {
            return null;
        }

        if (resolvedUserIds.has(telegramUserId)) {
            return resolvedUserIds.get(telegramUserId);
        }

        const client = getClient();
        if (!client) {
            return null;
        }

        const { data, error } = await client
            .from('users')
            .select('id')
            .eq('telegram_user_id', telegramUserId)
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!data?.id) {
            return null;
        }

        resolvedUserIds.set(telegramUserId, data.id);
        return data.id;
    }

    async function initUser(telegramUser) {
        try {
            if (!telegramUser?.id) {
                return null;
            }

            const client = getClient();
            if (!client) {
                return null;
            }

            const now = new Date().toISOString();

            const { data: existingUser, error: existingError } = await client
                .from('users')
                .select('id, first_open_at')
                .eq('telegram_user_id', telegramUser.id)
                .maybeSingle();

            if (existingError) {
                throw existingError;
            }

            const payload = {
                telegram_user_id: telegramUser.id,
                first_name: telegramUser.first_name || null,
                last_name: telegramUser.last_name || null,
                username: telegramUser.username || null,
                photo_url: telegramUser.photo_url || null,
                language_code: telegramUser.language_code || null,
                first_open_at: existingUser?.first_open_at || now,
                last_seen_at: now
            };

            const { data, error } = await client
                .from('users')
                .upsert(payload, { onConflict: 'telegram_user_id' })
                .select('*')
                .single();

            if (error) {
                throw error;
            }

            if (data?.id) {
                resolvedUserIds.set(telegramUser.id, data.id);
            }

            return data || null;
        } catch (error) {
            console.error('Supabase initUser error:', error);
            return null;
        }
    }

    async function getUserAccess(telegramUserId) {
        const defaultAccess = {
            access_type: 'free',
            max_day: 0,
            is_active: true
        };

        try {
            if (!telegramUserId) {
                return defaultAccess;
            }

            const client = getClient();
            if (!client) {
                return defaultAccess;
            }

            const userId = await resolveUserId(telegramUserId);
            if (!userId) {
                return defaultAccess;
            }

            const { data, error } = await client
                .from('user_access')
                .select('access_type, max_day, is_active')
                .eq('user_id', userId)
                .eq('is_active', true)
                .order('granted_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) {
                throw error;
            }

            if (!data) {
                return defaultAccess;
            }

            return {
                access_type: data.access_type || 'free',
                max_day: Number(data.max_day || 0),
                is_active: data.is_active !== false
            };
        } catch (error) {
            console.error('Supabase getUserAccess error:', error);
            return defaultAccess;
        }
    }

    async function getProgress(telegramUserId) {
        try {
            if (!telegramUserId) {
                return [];
            }

            const client = getClient();
            if (!client) {
                return [];
            }

            const userId = await resolveUserId(telegramUserId);
            if (!userId) {
                return [];
            }

            const { data, error } = await client
                .from('lesson_progress')
                .select('day_number, status, checklist_json, last_step')
                .eq('user_id', userId)
                .order('day_number', { ascending: true });

            if (error) {
                throw error;
            }

            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Supabase getProgress error:', error);
            return [];
        }
    }

    async function saveProgress(telegramUserId, dayNumber, data) {
        try {
            if (!telegramUserId || !Number.isFinite(Number(dayNumber))) {
                return null;
            }

            const client = getClient();
            if (!client) {
                return null;
            }

            const userId = await resolveUserId(telegramUserId);
            if (!userId) {
                return null;
            }

            const now = new Date().toISOString();
            const normalizedDayNumber = Number(dayNumber);

            const { data: existingRow, error: existingError } = await client
                .from('lesson_progress')
                .select('id, started_at, completed_at')
                .eq('user_id', userId)
                .eq('day_number', normalizedDayNumber)
                .maybeSingle();

            if (existingError) {
                throw existingError;
            }

            const status = data?.status || 'not_started';
            const payload = {
                user_id: userId,
                day_number: normalizedDayNumber,
                status: status,
                last_step: data?.last_step ?? null,
                checklist_json: Array.isArray(data?.checklist_json) ? data.checklist_json : [],
                started_at: existingRow?.started_at || (status !== 'not_started' ? now : null),
                completed_at: status === 'completed' ? (existingRow?.completed_at || now) : null
            };

            const { data: savedRow, error } = await client
                .from('lesson_progress')
                .upsert(payload, { onConflict: 'user_id,day_number' })
                .select('day_number, status, checklist_json, last_step')
                .single();

            if (error) {
                throw error;
            }

            return savedRow || payload;
        } catch (error) {
            console.error('Supabase saveProgress error:', error);
            return null;
        }
    }

    async function logEvent(telegramUserId, eventName, props) {
        try {
            if (!telegramUserId || !eventName) {
                return null;
            }

            const client = getClient();
            if (!client) {
                return null;
            }

            const userId = await resolveUserId(telegramUserId);
            if (!userId) {
                return null;
            }

            const { data, error } = await client
                .from('events')
                .insert({
                    user_id: userId,
                    event_name: eventName,
                    event_props_json: props || {}
                })
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data || null;
        } catch (error) {
            console.error('Supabase logEvent error:', error);
            return null;
        }
    }

    async function saveQuizResult(telegramUserId, quizType, answers, resultType) {
        try {
            if (!telegramUserId || !quizType) {
                return null;
            }

            const client = getClient();
            if (!client) {
                return null;
            }

            const userId = await resolveUserId(telegramUserId);
            if (!userId) {
                return null;
            }

            const { data, error } = await client
                .from('quiz_results')
                .insert({
                    user_id: userId,
                    quiz_type: quizType,
                    answers_json: Array.isArray(answers) ? answers : [],
                    result_type: resultType
                })
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data || null;
        } catch (error) {
            console.error('Supabase saveQuizResult error:', error);
            return null;
        }
    }

    window.supabaseStore = {
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        initUser,
        getUserAccess,
        getProgress,
        saveProgress,
        logEvent,
        saveQuizResult
    };
})();
