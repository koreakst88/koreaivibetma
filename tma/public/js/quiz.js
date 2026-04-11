// tma/public/js/quiz.js

(function () {
    const QUIZ_QUESTIONS = [
        {
            title: 'Есть ли у вас опыт программирования?',
            options: [
                'Нет, полный новичок',
                'Немного, базовый уровень',
                'Да, есть опыт'
            ]
        },
        {
            title: 'Какая у вас главная цель?',
            options: [
                'Создать свой продукт или стартап',
                'Автоматизировать рабочие процессы',
                'Освоить новую профессию',
                'Просто попробовать что-то новое'
            ]
        },
        {
            title: 'Сколько времени готовы уделять в неделю?',
            options: [
                '1-2 часа',
                '3-5 часов',
                'Более 5 часов'
            ]
        },
        {
            title: 'Какой формат обучения вам ближе?',
            options: [
                'Индивидуально с преподавателем',
                'Самостоятельно по материалам',
                'В группе с другими'
            ]
        },
        {
            title: 'Что для вас важнее всего в обучении?',
            options: [
                'Быстрый результат',
                'Глубокое понимание',
                'Практика и портфолио',
                'Поддержка и обратная связь'
            ]
        }
    ];

    const QUIZ_RESULTS = {
        start: {
            type: 'result_a',
            icon: '🎯',
            title: 'Отличный старт',
            text: 'Этот курс создан именно для вас. Вы начнёте с нуля и создадите реальный проект.'
        },
        fit: {
            type: 'result_b',
            icon: '✅',
            title: 'Хороший выбор',
            text: 'Ваш опыт поможет двигаться быстрее. Курс даст структуру и реальную практику.'
        },
        trial: {
            type: 'result_c',
            icon: '🎯',
            title: 'Попробуйте бесплатно',
            text: 'Начните с бесплатного урока и оцените формат сами.'
        }
    };

    let currentQuestionIndex = 0;
    let selectedAnswers = [];
    let hasSavedResult = false;

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
        impact('light');
        renderQuestion(questionIndex);
    }

    function calculateResult(answers) {
        const experience = answers[0];
        const format = answers[3];

        if (experience === 0 && format === 0) {
            return QUIZ_RESULTS.start;
        }

        if (experience === 1) {
            return QUIZ_RESULTS.fit;
        }

        if (experience === 2) {
            return QUIZ_RESULTS.trial;
        }

        return QUIZ_RESULTS.fit;
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

        questionScreen.style.display = 'none';
        resultScreen.style.display = '';
        resultScreen.innerHTML = `
            <div class="quiz-result__icon">${result.icon}</div>
            <h2>${result.title}</h2>
            <p>${result.text}</p>
            <div class="quiz-result__actions">
                <a class="btn-primary" href="day.html?id=day-0">Начать бесплатный урок</a>
                <a class="btn-secondary" href="https://t.me/koreakim88" target="_blank" rel="noopener noreferrer">Связаться с преподавателем</a>
            </div>
        `;

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

    function openQuiz() {
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
