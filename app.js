// 상태 관리
let state = {
    difficulty: "easy",
    questions: [],
    currentIndex: 0,
    score: 0,
    answers: [],
    timer: null,
    timeLeft: 30
};

// DOM 요소
const screens = {
    start: document.getElementById("start-screen"),
    quiz: document.getElementById("quiz-screen"),
    result: document.getElementById("result-screen")
};

const elements = {
    questionNumber: document.getElementById("question-number"),
    scoreDisplay: document.getElementById("score-display"),
    progressFill: document.getElementById("progress-fill"),
    timer: document.getElementById("timer"),
    questionText: document.getElementById("question-text"),
    options: document.getElementById("options"),
    feedback: document.getElementById("feedback"),
    feedbackText: document.getElementById("feedback-text"),
    bibleVerse: document.getElementById("bible-verse"),
    nextBtn: document.getElementById("next-btn"),
    resultScore: document.getElementById("result-score"),
    resultMessage: document.getElementById("result-message"),
    resultDetails: document.getElementById("result-details"),
    pageTurnOverlay: document.getElementById("page-turn-overlay"),
    quizPage: document.getElementById("quiz-page")
};

// 화면 전환 (페이지 넘김 효과 포함)
function showScreen(screenName) {
    const overlay = elements.pageTurnOverlay;
    overlay.classList.add("turning");

    setTimeout(() => {
        Object.values(screens).forEach(s => s.classList.remove("active"));
        screens[screenName].classList.add("active");
    }, 300);

    setTimeout(() => {
        overlay.classList.remove("turning");
    }, 600);
}

// 퀴즈 페이지 내 전환 효과
function turnQuizPage(callback) {
    const page = elements.quizPage;
    page.classList.add("page-exit");

    setTimeout(() => {
        page.classList.remove("page-exit");
        callback();
        page.classList.add("page-enter");
        setTimeout(() => {
            page.classList.remove("page-enter");
        }, 300);
    }, 300);
}

// 난이도 버튼
document.querySelectorAll(".difficulty-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".difficulty-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        state.difficulty = btn.dataset.difficulty;
    });
});

// 퀴즈 시작
document.getElementById("start-btn").addEventListener("click", startQuiz);
document.getElementById("retry-btn").addEventListener("click", startQuiz);
document.getElementById("home-btn").addEventListener("click", () => showScreen("start"));
elements.nextBtn.addEventListener("click", nextQuestion);

function startQuiz() {
    // 난이도별 문제 필터링
    let filtered = quizQuestions.filter(q => q.difficulty === state.difficulty);

    // 셔플 후 10문제 선택
    filtered = shuffle(filtered);
    state.questions = filtered.slice(0, 10);

    // 문제가 부족하면 다른 난이도에서 보충
    if (state.questions.length < 10) {
        let extra = quizQuestions.filter(q => !state.questions.includes(q));
        extra = shuffle(extra);
        state.questions = state.questions.concat(extra.slice(0, 10 - state.questions.length));
    }

    state.currentIndex = 0;
    state.score = 0;
    state.answers = [];

    showScreen("quiz");
    setTimeout(() => loadQuestion(), 350);
}

function loadQuestion() {
    const q = state.questions[state.currentIndex];
    const total = state.questions.length;

    // 헤더 업데이트
    elements.questionNumber.textContent = `${state.currentIndex + 1} / ${total}`;
    elements.scoreDisplay.textContent = `점수: ${state.score}`;
    elements.progressFill.style.width = `${((state.currentIndex) / total) * 100}%`;

    // 질문 표시
    elements.questionText.textContent = q.question;

    // 보기 표시
    elements.options.innerHTML = "";
    q.options.forEach((option, index) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.textContent = `${["A", "B", "C", "D"][index]}. ${option}`;
        btn.addEventListener("click", () => selectAnswer(index));
        elements.options.appendChild(btn);
    });

    // 피드백 숨기기
    elements.feedback.classList.add("hidden");

    // 타이머 시작
    startTimer();
}

function startTimer() {
    clearInterval(state.timer);

    const timeByDifficulty = { easy: 30, medium: 25, hard: 20 };
    state.timeLeft = timeByDifficulty[state.difficulty] || 30;
    elements.timer.textContent = state.timeLeft;
    elements.timer.classList.remove("warning");

    state.timer = setInterval(() => {
        state.timeLeft--;
        elements.timer.textContent = state.timeLeft;

        if (state.timeLeft <= 5) {
            elements.timer.classList.add("warning");
        }

        if (state.timeLeft <= 0) {
            clearInterval(state.timer);
            selectAnswer(-1); // 시간 초과
        }
    }, 1000);
}

function selectAnswer(selectedIndex) {
    clearInterval(state.timer);

    const q = state.questions[state.currentIndex];
    const buttons = document.querySelectorAll(".option-btn");
    const isCorrect = selectedIndex === q.answer;

    // 모든 버튼 비활성화
    buttons.forEach(btn => btn.classList.add("disabled"));

    // 정답 표시
    buttons[q.answer].classList.add("correct");

    // 오답 표시
    if (selectedIndex >= 0 && !isCorrect) {
        buttons[selectedIndex].classList.add("wrong");
    }

    // 점수 업데이트
    if (isCorrect) {
        state.score++;
        elements.feedbackText.textContent = "정답입니다!";
        elements.feedbackText.style.color = "#7ddf7d";
    } else if (selectedIndex === -1) {
        elements.feedbackText.textContent = "시간 초과!";
        elements.feedbackText.style.color = "#f08080";
    } else {
        elements.feedbackText.textContent = "틀렸습니다!";
        elements.feedbackText.style.color = "#f08080";
    }

    elements.scoreDisplay.textContent = `점수: ${state.score}`;
    elements.bibleVerse.textContent = q.verse;
    elements.feedback.classList.remove("hidden");

    // 마지막 문제면 버튼 텍스트 변경
    if (state.currentIndex >= state.questions.length - 1) {
        elements.nextBtn.textContent = "결과 보기";
    } else {
        elements.nextBtn.textContent = "다음 문제";
    }

    // 답변 기록 (성경 구절 포함)
    state.answers.push({
        question: q.question,
        selected: selectedIndex >= 0 ? q.options[selectedIndex] : "시간 초과",
        correct: q.options[q.answer],
        isCorrect: isCorrect,
        verse: q.verse
    });
}

function nextQuestion() {
    state.currentIndex++;

    if (state.currentIndex >= state.questions.length) {
        showScreen("result");
        setTimeout(() => showResult(), 350);
    } else {
        // 페이지 넘김 효과와 함께 다음 문제 로드
        turnQuizPage(() => loadQuestion());
    }
}

function showResult() {
    const total = state.questions.length;
    elements.resultScore.textContent = state.score;
    document.querySelector(".result-total").textContent = `/ ${total}`;

    // 결과 메시지
    const percentage = (state.score / total) * 100;
    let message = "";
    if (percentage === 100) {
        message = "\"완벽합니다! 마가복음의 참된 제자이시네요!\"";
    } else if (percentage >= 80) {
        message = "\"훌륭합니다! 하나님의 말씀이 마음에 새겨져 있습니다!\"";
    } else if (percentage >= 60) {
        message = "\"좋습니다! 조금 더 묵상하면 더 깊이 알게 될 거예요!\"";
    } else if (percentage >= 40) {
        message = "\"괜찮아요! 마가복음을 다시 읽어보세요. 은혜가 넘칠 것입니다!\"";
    } else {
        message = "\"마가복음을 천천히 읽어보세요. 말씀 안에 보물이 가득합니다!\"";
    }
    elements.resultMessage.textContent = message;

    // 상세 결과 (정답 + 성경 구절 표시)
    elements.resultDetails.innerHTML = "";
    state.answers.forEach((answer, index) => {
        const item = document.createElement("div");
        item.className = `result-item ${answer.isCorrect ? "correct" : "wrong"}`;
        item.innerHTML = `
            <strong>Q${index + 1}. ${answer.question}</strong><br>
            내 답: ${answer.selected}
            <div class="correct-answer">정답: ${answer.correct}</div>
            <div class="verse-ref">${answer.verse}</div>
        `;
        elements.resultDetails.appendChild(item);
    });

    // 프로그레스 바 완료
    elements.progressFill.style.width = "100%";
}

// 배열 셔플
function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
