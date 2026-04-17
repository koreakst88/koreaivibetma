// tma/public/js/quiz.js

(function () {
    const PRICING_BY_REGION = {
        RU: {
            consult: '2 000 ₽',
            pack3: '5 000 ₽',
            course: '13 000 ₽'
        },
        KZ: {
            consult: '15.000 ₸',
            pack3: '35.000 ₸',
            course: '80.000 ₸'
        },
        KR: {
            consult: '40.000 ₩',
            pack3: '90.000 ₩',
            course: '250.000 ₩'
        },
        DEFAULT: {
            consult: '$25',
            pack3: '$60',
            course: '$170'
        }
    };

    const QUIZ_QUESTIONS = [
        {
            title: 'Есть ли у вас опыт в разработке или создании digital-продуктов?',
            options: [
                'Нет, я полный новичок',
                'Немного пробовал(а)',
                'Есть базовое понимание'
            ]
        },
        {
            title: 'Какая у вас главная цель?',
            options: [
                'Хочу научиться и попробовать новое',
                'Хочу зарабатывать на этом',
                'Хочу сделать проект для себя или бизнеса'
            ]
        },
        {
            title: 'Что вам ближе сейчас?',
            options: [
                'Пошаговое объяснение с нуля',
                'Быстрый результат и практика',
                'Разобраться в инструментах и автоматизации'
            ]
        },
        {
            title: 'Есть ли у вас уже идея проекта?',
            options: [
                'Да, есть конкретная идея',
                'Есть общее направление но нет деталей',
                'Пока нет, только изучаю возможности'
            ]
        }
    ];

    const QUIZ_RESULTS = {
        beginner: {
            type: 'beginner',
            icon: '🎯',
            title: 'Вы в правильном месте',
            text: 'Начнёте с нуля и выйдете с готовым прототипом. Никакого лишнего кода — только практика и результат.',
            recommended: { key: 'course', label: 'Курс 7 уроков', href: 'https://t.me/koreaivibe_bot?start=course', badge: 'Рекомендуем' },
            secondary: [
                { key: 'pack3', label: 'Пакет 3 сессии', href: 'https://t.me/koreaivibe_bot?start=pack3' },
                { key: 'consult', label: 'Вайб-сессия', href: 'https://t.me/koreaivibe_bot?start=consult' }
            ]
        },
        explorer: {
            type: 'explorer',
            icon: '✅',
            title: 'Самое время сделать первый реальный шаг',
            text: 'У вас уже есть база — осталось направить её в нужную сторону. Работаем не по шаблону, а под конкретную задачу. От трёх сессий до реального проекта, а если захочется большего — всегда можно продолжить.',
            recommended: { key: 'pack3', label: 'Пакет 3 сессии', href: 'https://t.me/koreaivibe_bot?start=pack3', badge: 'Рекомендуем' },
            secondary: [
                { key: 'course', label: 'Курс 7 уроков', href: 'https://t.me/koreaivibe_bot?start=course' },
                { key: 'consult', label: 'Вайб-сессия', href: 'https://t.me/koreaivibe_bot?start=consult' }
            ]
        },
        builder: {
            type: 'builder',
            icon: '🎯',
            title: 'Ваш проект заслуживает экспертного подхода',
            text: 'Работаю не по шаблону — разбираем вашу задачу, подключаю опыт в маркетинге и реализации нестандартных решений. Первая сессия это знакомство и погружение в проект, дальше двигаемся в вашем темпе — каждую сессию докупаете по необходимости.',
            recommended: { key: 'consult', label: 'Вайб-сессия', href: 'https://t.me/koreaivibe_bot?start=consult', badge: 'Рекомендуем' },
            secondary: [
                { key: 'course', label: 'Курс 7 уроков', href: 'https://t.me/koreaivibe_bot?start=course' },
                { key: 'pack3', label: 'Пакет 3 сессии', href: 'https://t.me/koreaivibe_bot?start=pack3' }
            ]
        }
    };

    let currentQuestionIndex = 0;
    let selectedAnswers = [];
    let hasSavedResult = false;
    let pricingRegion = 'DEFAULT';
    let pricingRegionLoaded = false;
    let pricingRegionPromise = null;

    function trackQuizEvent(name, props = {}) {
        if (typeof trackEvent === 'function') {
            try {
                trackEvent(name, props);
            } catch (error) {
                console.warn(`[Analytics] ${name} error:`, error);
            }
        }
    }

    function impact(type) {
        if (type === 'light' && window.Haptic?.light) {
            window.Haptic.light();
        } else if (type === 'medium' && window.Haptic?.medium) {
            window.Haptic.medium();
        }
    }

    function notifySuccess() {
        if (window.Haptic?.success) {
            window.Haptic.success();
        }
    }

    async function loadPricingRegion() {
        if (pricingRegionLoaded) {
            return pricingRegion;
        }

        if (pricingRegionPromise) {
            return pricingRegionPromise;
        }

        pricingRegionPromise = (async () => {
            try {
                const response = await fetch('/api/geo', {
                    method: 'GET',
                    cache: 'no-store',
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`Geo request failed: ${response.status}`);
                }

                const data = await response.json();
                const nextRegion = String(data?.pricingRegion || '').toUpperCase();

                if (PRICING_BY_REGION[nextRegion]) {
                    pricingRegion = nextRegion;
                } else {
                    pricingRegion = 'DEFAULT';
                }
            } catch (error) {
                pricingRegion = 'DEFAULT';
            } finally {
                pricingRegionLoaded = true;
            }

            return pricingRegion;
        })();

        return pricingRegionPromise;
    }

    function getPriceByKey(planKey) {
        const region = pricingRegion;
        return PRICING_BY_REGION[region]?.[planKey] || PRICING_BY_REGION.DEFAULT[planKey] || '';
    }

    function getQuestionScreen() {
        return document.getElementById('quiz-question-screen');
    }

    function getResultScreen() {
        return document.getElementById('quiz-result');
    }

    function updateProgress() {
        const progressText = document.getElementById('quiz-progress-text');
        const progressBar = document.getElementById('quiz-progress-bar');
        const total = QUIZ_QUESTIONS.length;
        const current = Math.min(currentQuestionIndex + 1, total);
        const percent = Math.round((current / total) * 100);

        if (progressText) {
            progressText.textContent = `Вопрос ${current} из ${total}`;
        }

        if (progressBar) {
            progressBar.style.width = `${percent}%`;
        }
    }

    function updateNavigation() {
        const prevButton = document.getElementById('quiz-prev');
        const nextButton = document.getElementById('quiz-next');
        const selectedAnswer = selectedAnswers[currentQuestionIndex];

        if (prevButton) {
            prevButton.disabled = currentQuestionIndex === 0;
        }

        if (nextButton) {
            nextButton.disabled = typeof selectedAnswer !== 'number';
            nextButton.textContent = currentQuestionIndex === QUIZ_QUESTIONS.length - 1 ? 'Показать результат' : 'Далее';
        }
    }

    function renderQuestion(index) {
        currentQuestionIndex = index;
        const question = QUIZ_QUESTIONS[index];
        const title = document.getElementById('quiz-question-title');
        const options = document.getElementById('quiz-options');
        const resultScreen = getResultScreen();
        const questionScreen = getQuestionScreen();

        if (!question || !title || !options || !questionScreen || !resultScreen) {
            return;
        }

        questionScreen.style.display = '';
        resultScreen.style.display = 'none';

        title.textContent = question.title;
        options.innerHTML = '';

        question.options.forEach((option, answerIndex) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `quiz-option${selectedAnswers[index] === answerIndex ? ' selected' : ''}`;
            button.textContent = option;
            button.addEventListener('click', () => {
                selectAnswer(index, answerIndex);
            });
            options.appendChild(button);
        });

        updateProgress();
        updateNavigation();
    }

    function selectAnswer(questionIndex, answerIndex) {
        selectedAnswers[questionIndex] = answerIndex;
        trackQuizEvent('quiz_answered', {
            question_index: questionIndex,
            answer_index: answerIndex
        });
        impact('light');
        renderQuestion(questionIndex);
    }

    function calculateResult(answers) {
        const [q1, q2, q3, q4] = answers;

        if (
            q1 === 2 ||
            (q2 === 2 && q4 === 0) ||
            (q2 === 1 && q4 === 0)
        ) {
            return QUIZ_RESULTS.builder;
        }

        if (
            q1 === 1 ||
            q3 === 1 ||
            q4 === 1
        ) {
            return QUIZ_RESULTS.explorer;
        }

        return QUIZ_RESULTS.beginner;
    }

    async function saveQuizResult(result) {
        const telegramUserId = window.currentTelegramUserId || window.Telegram?.WebApp?.initDataUnsafe?.user?.id || null;

        if (!telegramUserId || !window.supabaseStore?.saveQuizResult) {
            return null;
        }

        return await window.supabaseStore.saveQuizResult(telegramUserId, 'fit_check', selectedAnswers, result.type);
    }

    async function showResult() {
        const questionScreen = getQuestionScreen();
        const resultScreen = getResultScreen();
        const result = calculateResult(selectedAnswers);

        if (!questionScreen || !resultScreen) {
            return;
        }

        await loadPricingRegion();

        const recommendedPrice = getPriceByKey(result.recommended.key);
        const recommendedCard = `
            <div style="border:1px solid #7c3aed;border-radius:20px;padding:18px;text-align:left;display:flex;flex-direction:column;gap:14px;">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
                    <strong style="font-size:18px;color:#0f172a;">${result.recommended.label}</strong>
                    <span style="background:#7c3aed;color:#fff;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:700;white-space:nowrap;">${result.recommended.badge}</span>
                </div>
                <div style="font-size:28px;font-weight:800;line-height:1;color:#0f172a;">${recommendedPrice}</div>
                <button id="quiz-plan-primary" type="button" style="width:100%;border:none;border-radius:999px;background:#7c3aed;color:#fff;padding:14px 18px;font-size:15px;font-weight:700;cursor:pointer;">Начать</button>
            </div>
        `;

        const secondaryCards = result.secondary.map((plan, index) => `
            <div style="border:1px solid rgba(15,23,42,0.08);border-radius:20px;padding:18px;text-align:left;display:flex;flex-direction:column;gap:14px;">
                <strong style="font-size:17px;color:#0f172a;">${plan.label}</strong>
                <div style="font-size:24px;font-weight:800;line-height:1;color:#0f172a;">${getPriceByKey(plan.key)}</div>
                <button id="quiz-plan-secondary-${index}" type="button" style="width:100%;border:1px solid rgba(15,23,42,0.16);border-radius:999px;background:transparent;color:#0f172a;padding:14px 18px;font-size:15px;font-weight:700;cursor:pointer;">Начать</button>
            </div>
        `).join('');

        questionScreen.style.display = 'none';
        resultScreen.style.display = '';
        resultScreen.innerHTML = `
            <div class="quiz-result__icon">${result.icon}</div>
            <h2>${result.title}</h2>
            <p>${result.text}</p>
            <div class="quiz-result__actions" style="gap:14px;">
                ${recommendedCard}
                ${secondaryCards}
            </div>
        `;

        trackQuizEvent('quiz_completed', {
            result_type: result.type,
            answers_count: selectedAnswers.length
        });

        resultScreen.querySelector('#quiz-plan-primary')?.addEventListener('click', () => {
            trackQuizEvent('quiz_cta_clicked', {
                result_type: result.type,
                cta: 'recommended'
            });
            window.location.href = result.recommended.href;
        });

        result.secondary.forEach((plan, index) => {
            resultScreen.querySelector(`#quiz-plan-secondary-${index}`)?.addEventListener('click', () => {
                trackQuizEvent('quiz_cta_clicked', {
                    result_type: result.type,
                    cta: plan.label
                });
                window.location.href = plan.href;
            });
        });

        if (!hasSavedResult) {
            hasSavedResult = true;
            await saveQuizResult(result);
        }

        notifySuccess();
    }

    async function nextQuestion() {
        if (typeof selectedAnswers[currentQuestionIndex] !== 'number') {
            return;
        }

        if (currentQuestionIndex >= QUIZ_QUESTIONS.length - 1) {
            await showResult();
            return;
        }

        renderQuestion(currentQuestionIndex + 1);
    }

    function prevQuestion() {
        if (currentQuestionIndex <= 0) {
            return;
        }

        renderQuestion(currentQuestionIndex - 1);
    }

    function resetQuiz() {
        currentQuestionIndex = 0;
        selectedAnswers = [];
        hasSavedResult = false;
        renderQuestion(0);
    }

    async function openQuiz() {
        trackQuizEvent('quiz_started', {
            source: 'home_card'
        });
        await loadPricingRegion();
        resetQuiz();
    }

    function bindEvents() {
        const prevButton = document.getElementById('quiz-prev');
        const nextButton = document.getElementById('quiz-next');
        const backButton = document.getElementById('quiz-back');

        if (prevButton) {
            prevButton.addEventListener('click', prevQuestion);
        }

        if (nextButton) {
            nextButton.addEventListener('click', async () => {
                await nextQuestion();
            });
        }

        if (backButton) {
            backButton.addEventListener('click', () => {
                if (typeof showAppSection === 'function') {
                    showAppSection('home-section', 'tab-home');
                }
            });
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        bindEvents();
        renderQuestion(0);
    });

    window.quizApp = {
        questions: QUIZ_QUESTIONS,
        renderQuestion,
        selectAnswer,
        nextQuestion,
        prevQuestion,
        calculateResult,
        saveQuizResult,
        openQuiz,
        resetQuiz
    };
})();
