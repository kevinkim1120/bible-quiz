// 상태 관리
let state = {
    mode: "bank",       // "bank" or "exam"
    questionCount: 10,  // 10 or 20
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
    subjectiveArea: document.getElementById("subjective-area"),
    subjectiveInput: document.getElementById("subjective-input"),
    submitAnswerBtn: document.getElementById("submit-answer-btn"),
    feedback: document.getElementById("feedback"),
    feedbackText: document.getElementById("feedback-text"),
    bibleVerse: document.getElementById("bible-verse"),
    nextBtn: document.getElementById("next-btn"),
    resultScore: document.getElementById("result-score"),
    resultMessage: document.getElementById("result-message"),
    resultDetails: document.getElementById("result-details"),
    quizPage: document.getElementById("quiz-page")
};

// 부드러운 화면 전환
function showScreen(screenName) {
    const currentScreen = document.querySelector('.screen.active');
    if (currentScreen) {
        currentScreen.classList.add('screen-exit');
        setTimeout(() => {
            currentScreen.classList.remove('active', 'screen-exit');
            screens[screenName].classList.add('active', 'screen-enter');
            setTimeout(() => {
                screens[screenName].classList.remove('screen-enter');
            }, 400);
        }, 300);
    } else {
        screens[screenName].classList.add('active');
    }
}

// 문제 간 부드러운 전환
function transitionQuestion(callback) {
    const page = elements.quizPage;
    page.classList.add('content-fade-out');
    setTimeout(() => {
        callback();
        page.classList.remove('content-fade-out');
        page.classList.add('content-fade-in');
        setTimeout(() => {
            page.classList.remove('content-fade-in');
        }, 350);
    }, 250);
}

// 모드 버튼
document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        state.questionCount = parseInt(btn.dataset.mode);
    });
});

// 퀴즈 시작
document.getElementById("start-btn").addEventListener("click", () => {
    state.mode = "bank";
    startQuiz();
});

// 기출문제 시작
document.getElementById("exam-btn").addEventListener("click", () => {
    state.mode = "exam";
    startQuiz();
});

// 다시 도전
document.getElementById("retry-btn").addEventListener("click", () => startQuiz());

// 틀린 문제 다시 풀기
document.getElementById("wrong-retry-btn").addEventListener("click", retryWrongAnswers);

// 처음으로
document.getElementById("home-btn").addEventListener("click", () => showScreen("start"));

// 다음 문제
elements.nextBtn.addEventListener("click", nextQuestion);

// 주관식 정답 제출
elements.submitAnswerBtn.addEventListener("click", submitSubjectiveAnswer);
elements.subjectiveInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") submitSubjectiveAnswer();
});

function startQuiz() {
    let selected;

    if (state.mode === "exam") {
        // 기출문제 모드: 기출문제 전체 풀기
        selected = shuffle([...examQuestions]);
    } else {
        // 일반 모드: 문제은행에서 랜덤 선택
        let pool = shuffle([...bankQuestions]);
        selected = pool.slice(0, state.questionCount);
    }

    state.questions = selected;
    state.currentIndex = 0;
    state.score = 0;
    state.answers = [];

    showScreen("quiz");
    setTimeout(() => loadQuestion(), 400);
}

function retryWrongAnswers() {
    // 틀린 문제들만 모아서 다시 풀기
    const wrongQuestions = [];
    state.answers.forEach((ans, idx) => {
        if (!ans.isCorrect) {
            wrongQuestions.push(state.questions[idx]);
        }
    });

    if (wrongQuestions.length === 0) return;

    state.questions = shuffle(wrongQuestions);
    state.currentIndex = 0;
    state.score = 0;
    state.answers = [];

    showScreen("quiz");
    setTimeout(() => loadQuestion(), 400);
}

function loadQuestion() {
    const q = state.questions[state.currentIndex];
    const total = state.questions.length;

    // 헤더 업데이트
    elements.questionNumber.textContent = `${state.currentIndex + 1} / ${total}`;
    elements.scoreDisplay.textContent = `점수: ${state.score}`;
    elements.progressFill.style.width = `${((state.currentIndex) / total) * 100}%`;

    // 질문 표시
    const typeLabel = q.type === "subjective" ? "[주관식] " : "";
    elements.questionText.textContent = typeLabel + q.question;

    // 객관식 vs 주관식 분기
    if (q.type === "subjective") {
        // 주관식: 보기 숨기고 입력란 표시
        elements.options.innerHTML = "";
        elements.options.classList.add("hidden");
        elements.subjectiveArea.classList.remove("hidden");
        elements.subjectiveInput.value = "";
        elements.subjectiveInput.focus();
    } else {
        // 객관식: 보기 표시, 입력란 숨기기
        elements.subjectiveArea.classList.add("hidden");
        elements.options.classList.remove("hidden");
        elements.options.innerHTML = "";

        // 보기 순서 랜덤화
        const indices = q.options.map((_, i) => i);
        const shuffledIndices = shuffle(indices);

        shuffledIndices.forEach((origIdx) => {
            const option = q.options[origIdx];
            const btn = document.createElement("button");
            btn.className = "option-btn";
            btn.textContent = `${["A", "B", "C", "D"][shuffledIndices.indexOf(origIdx)]}. ${option}`;
            btn.dataset.origIndex = origIdx;
            btn.addEventListener("click", () => selectAnswer(origIdx, shuffledIndices));
            elements.options.appendChild(btn);
        });
    }

    // 피드백 숨기기
    elements.feedback.classList.add("hidden");

    // 타이머 시작
    startTimer();
}

function startTimer() {
    clearInterval(state.timer);
    state.timeLeft = 30;
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
            const q = state.questions[state.currentIndex];
            if (q.type === "subjective") {
                handleSubjectiveResult("", true);
            } else {
                selectAnswer(-1, []);
            }
        }
    }, 1000);
}

function selectAnswer(selectedOrigIndex, shuffledIndices) {
    clearInterval(state.timer);

    const q = state.questions[state.currentIndex];
    const buttons = document.querySelectorAll(".option-btn");
    const isCorrect = selectedOrigIndex === q.answer;

    // 모든 버튼 비활성화
    buttons.forEach(btn => btn.classList.add("disabled"));

    // 정답/오답 표시 (원래 인덱스 기준)
    buttons.forEach(btn => {
        const origIdx = parseInt(btn.dataset.origIndex);
        if (origIdx === q.answer) {
            btn.classList.add("correct");
        }
        if (origIdx === selectedOrigIndex && !isCorrect) {
            btn.classList.add("wrong");
        }
    });

    // 점수 및 피드백
    if (isCorrect) {
        state.score++;
        elements.feedbackText.textContent = "정답입니다!";
        elements.feedbackText.style.color = "#7ddf7d";
    } else if (selectedOrigIndex === -1) {
        elements.feedbackText.textContent = "시간 초과!";
        elements.feedbackText.style.color = "#f08080";
    } else {
        elements.feedbackText.textContent = "틀렸습니다!";
        elements.feedbackText.style.color = "#f08080";
    }

    elements.scoreDisplay.textContent = `점수: ${state.score}`;
    elements.bibleVerse.textContent = q.verse;
    elements.feedback.classList.remove("hidden");

    updateNextButton();

    // 답변 기록
    state.answers.push({
        question: q.question,
        selected: selectedOrigIndex >= 0 ? q.options[selectedOrigIndex] : "시간 초과",
        correct: q.options[q.answer],
        isCorrect: isCorrect,
        verse: q.verse,
        type: q.type
    });
}

function submitSubjectiveAnswer() {
    const userAnswer = elements.subjectiveInput.value.trim();
    if (!userAnswer) return;
    handleSubjectiveResult(userAnswer, false);
}

function handleSubjectiveResult(userAnswer, isTimeout) {
    clearInterval(state.timer);

    const q = state.questions[state.currentIndex];

    // 정답 여부 판단 (허용 답안 리스트에서 부분 일치 확인)
    let isCorrect = false;
    if (!isTimeout && q.acceptableAnswers) {
        const normalizedUser = userAnswer.replace(/\s+/g, '').toLowerCase();
        isCorrect = q.acceptableAnswers.some(ans => {
            const normalizedAns = ans.replace(/\s+/g, '').toLowerCase();
            return normalizedUser.includes(normalizedAns) || normalizedAns.includes(normalizedUser);
        });
    }

    // 입력 비활성화
    elements.subjectiveInput.disabled = true;
    elements.submitAnswerBtn.disabled = true;

    // 정답 표시
    if (isCorrect) {
        state.score++;
        elements.subjectiveInput.classList.add("input-correct");
        elements.feedbackText.textContent = "정답입니다!";
        elements.feedbackText.style.color = "#7ddf7d";
    } else if (isTimeout) {
        elements.subjectiveInput.classList.add("input-wrong");
        elements.feedbackText.textContent = "시간 초과!";
        elements.feedbackText.style.color = "#f08080";
    } else {
        elements.subjectiveInput.classList.add("input-wrong");
        elements.feedbackText.textContent = "틀렸습니다!";
        elements.feedbackText.style.color = "#f08080";
    }

    // 정답 보여주기
    const correctDisplay = document.createElement("div");
    correctDisplay.className = "correct-answer-display";
    correctDisplay.textContent = `정답: ${q.subjectiveAnswer}`;
    elements.subjectiveArea.appendChild(correctDisplay);

    elements.scoreDisplay.textContent = `점수: ${state.score}`;
    elements.bibleVerse.textContent = q.verse;
    elements.feedback.classList.remove("hidden");

    updateNextButton();

    // 답변 기록
    state.answers.push({
        question: q.question,
        selected: isTimeout ? "시간 초과" : userAnswer,
        correct: q.subjectiveAnswer,
        isCorrect: isCorrect,
        verse: q.verse,
        type: q.type
    });
}

function updateNextButton() {
    if (state.currentIndex >= state.questions.length - 1) {
        elements.nextBtn.textContent = "결과 보기";
    } else {
        elements.nextBtn.textContent = "다음 문제";
    }
}

function nextQuestion() {
    // 주관식 관련 초기화
    elements.subjectiveInput.disabled = false;
    elements.submitAnswerBtn.disabled = false;
    elements.subjectiveInput.classList.remove("input-correct", "input-wrong");
    const correctDisplay = elements.subjectiveArea.querySelector(".correct-answer-display");
    if (correctDisplay) correctDisplay.remove();

    state.currentIndex++;

    if (state.currentIndex >= state.questions.length) {
        showScreen("result");
        setTimeout(() => showResult(), 400);
    } else {
        transitionQuestion(() => loadQuestion());
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

    // 틀린 문제 다시 풀기 버튼
    const wrongCount = state.answers.filter(a => !a.isCorrect).length;
    const wrongRetryBtn = document.getElementById("wrong-retry-btn");
    if (wrongCount > 0) {
        wrongRetryBtn.style.display = "block";
        wrongRetryBtn.textContent = `\u274C 틀린 문제 다시 풀기 (${wrongCount}문제)`;
    } else {
        wrongRetryBtn.style.display = "none";
    }

    // 상세 결과
    elements.resultDetails.innerHTML = "";
    state.answers.forEach((answer, index) => {
        const item = document.createElement("div");
        item.className = `result-item ${answer.isCorrect ? "correct" : "wrong"}`;
        const typeTag = answer.type === "subjective" ? '<span class="type-tag subjective">주관식</span>' : '<span class="type-tag objective">객관식</span>';
        item.innerHTML = `
            <strong>${typeTag} Q${index + 1}. ${answer.question}</strong><br>
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
