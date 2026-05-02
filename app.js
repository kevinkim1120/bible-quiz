// ===== 인트로 오버레이 =====
(function handleIntro() {
    const overlay = document.getElementById("intro-overlay");
    if (!overlay) return;
    const skipBtn = document.getElementById("intro-skip");
    let removed = false;
    const finish = () => {
        if (removed) return;
        removed = true;
        overlay.classList.add("skip");
        setTimeout(() => overlay.classList.add("intro-done"), 500);
    };
    skipBtn?.addEventListener("click", finish);
    // 애니메이션 완전 종료 후 DOM에서 숨김 (약 5초)
    setTimeout(() => {
        if (!removed) overlay.classList.add("intro-done");
    }, 5200);
})();

// 상태 관리
let state = {
    mode: "bank",           // "bank" or "exam"
    difficulty: "easy",     // "easy" or "hard"
    questions: [],
    currentIndex: 0,
    score: 0,
    answers: [],
    timer: null,
    timeLeft: 30,
    multiSelected: new Set()  // 복수정답 선택 상태
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

// 난이도 버튼
document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        state.difficulty = btn.dataset.difficulty;
    });
});

// 퀴즈 시작
document.getElementById("start-btn").addEventListener("click", () => {
    state.mode = "bank";
    startQuiz();
});

// 예상문제 1
document.getElementById("exam-btn").addEventListener("click", () => {
    state.mode = "exam";
    startQuiz();
});

// 예상문제 2 (NEW)
document.getElementById("exam2-btn").addEventListener("click", () => {
    state.mode = "exam2";
    startQuiz();
});

// 갤러리
const galleryModal = document.getElementById("gallery-modal");
function openGallery() {
    if (!galleryModal) return;
    galleryModal.hidden = false;
    galleryModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("gallery-open");
    requestAnimationFrame(() => galleryModal.classList.add("show"));
}
function closeGallery() {
    if (!galleryModal) return;
    galleryModal.classList.remove("show");
    galleryModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("gallery-open");
    setTimeout(() => { galleryModal.hidden = true; }, 260);
}
document.getElementById("gallery-btn")?.addEventListener("click", openGallery);
document.getElementById("gallery-close")?.addEventListener("click", closeGallery);
galleryModal?.querySelectorAll("[data-gallery-close]").forEach(el => {
    el.addEventListener("click", closeGallery);
});
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && galleryModal && !galleryModal.hidden) closeGallery();
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
    // 기존 스테이지 모드 잔재 정리
    cleanupStageHud();

    let selected;

    if (state.mode === "exam") {
        // 예상문제 1: 전체 풀기
        selected = shuffle([...examQuestions]);
    } else if (state.mode === "exam2") {
        // 예상문제 2: 전체 풀기
        selected = shuffle([...examQuestions2]);
    } else {
        // 문제은행 모드: 난이도로 필터링 후 랜덤 10문제 출제
        const pool = bankQuestions.filter(q => q.difficulty === state.difficulty);
        selected = shuffle(pool).slice(0, 10);
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

        const isMulti = Array.isArray(q.answer);
        state.multiSelected = new Set();

        // 보기 순서 랜덤화
        const indices = q.options.map((_, i) => i);
        const shuffledIndices = shuffle(indices);

        shuffledIndices.forEach((origIdx) => {
            const option = q.options[origIdx];
            const btn = document.createElement("button");
            btn.className = "option-btn";
            btn.textContent = `${["A", "B", "C", "D"][shuffledIndices.indexOf(origIdx)]}. ${option}`;
            btn.dataset.origIndex = origIdx;
            if (isMulti) {
                btn.addEventListener("click", () => toggleMultiOption(btn, origIdx));
            } else {
                btn.addEventListener("click", () => selectAnswer(origIdx, shuffledIndices));
            }
            elements.options.appendChild(btn);
        });

        if (isMulti) {
            const submitBtn = document.createElement("button");
            submitBtn.id = "multi-submit-btn";
            submitBtn.className = "primary-btn submit-btn multi-submit-btn";
            submitBtn.textContent = "정답 제출";
            submitBtn.addEventListener("click", () => submitMultiAnswer());
            elements.options.appendChild(submitBtn);
        }
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
            } else if (Array.isArray(q.answer)) {
                submitMultiAnswer(true);
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

function toggleMultiOption(btn, origIdx) {
    if (btn.classList.contains("disabled")) return;
    if (state.multiSelected.has(origIdx)) {
        state.multiSelected.delete(origIdx);
        btn.classList.remove("selected");
    } else {
        state.multiSelected.add(origIdx);
        btn.classList.add("selected");
    }
}

function submitMultiAnswer(isTimeout = false) {
    clearInterval(state.timer);

    const q = state.questions[state.currentIndex];
    const buttons = document.querySelectorAll(".option-btn");
    const correct = new Set(q.answer);
    const selected = state.multiSelected;

    const isCorrect = !isTimeout
        && selected.size === correct.size
        && [...selected].every(i => correct.has(i));

    // 모든 버튼/제출 버튼 비활성화
    buttons.forEach(btn => btn.classList.add("disabled"));
    const submitBtn = document.getElementById("multi-submit-btn");
    if (submitBtn) submitBtn.disabled = true;

    // 정답/오답 표시 (원래 인덱스 기준)
    buttons.forEach(btn => {
        const origIdx = parseInt(btn.dataset.origIndex);
        if (isNaN(origIdx)) return;
        if (correct.has(origIdx)) {
            btn.classList.add("correct");
        }
        if (selected.has(origIdx) && !correct.has(origIdx)) {
            btn.classList.add("wrong");
        }
    });

    // 점수 및 피드백
    if (isCorrect) {
        state.score++;
        elements.feedbackText.textContent = "정답입니다!";
        elements.feedbackText.style.color = "#7ddf7d";
    } else if (isTimeout) {
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
    const selectedLabel = isTimeout
        ? "시간 초과"
        : ([...selected].sort((a, b) => a - b).map(i => q.options[i]).join(", ") || "선택 안함");
    const correctLabel = q.answer.map(i => q.options[i]).join(", ");
    state.answers.push({
        question: q.question,
        selected: selectedLabel,
        correct: correctLabel,
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
        if (state.mode === "stage") {
            clearInterval(state.timer);
            handleStageEnd();
            return;
        }
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

// =====================================================================
//  여정 모드 — 스테이지 맵 / 스테이지 퀴즈 / 승천 엔딩
// =====================================================================

const STAGE_CHAPTERS = [
    { ch:1,  title:'광야의 외침',    sub:'세례 요한 · 세례 · 첫 제자' },
    { ch:2,  title:'새 포도주',      sub:'중풍병자 · 레위 · 안식일' },
    { ch:3,  title:'열두 제자',      sub:'손 마른 자 · 12사도 · 바알세불' },
    { ch:4,  title:'씨뿌리는 자',    sub:'씨 · 등불 · 풍랑' },
    { ch:5,  title:'권능의 손길',    sub:'거라사 · 혈루병 · 야이로' },
    { ch:6,  title:'오병이어',       sub:'12제자 파송 · 물 위 걸음' },
    { ch:7,  title:'마음의 정결',    sub:'장로의 전통 · 수로보니게 · 에바다' },
    { ch:8,  title:'신앙고백',       sub:'칠병이어 · 베드로 · 자기 십자가' },
    { ch:9,  title:'변화산',         sub:'모세와 엘리야 · 귀신들린 아이' },
    { ch:10, title:'섬기는 자',      sub:'이혼 · 부자 청년 · 바디매오' },
    { ch:11, title:'예루살렘 입성',  sub:'나귀 · 성전 정화 · 무화과' },
    { ch:12, title:'큰 계명',        sub:'포도원 농부 · 가이사 · 두 렙돈' },
    { ch:13, title:'깨어 있으라',    sub:'성전 멸망 · 종말 · 재림' },
    { ch:14, title:'겟세마네',       sub:'향유 · 최후 만찬 · 체포' },
    { ch:15, title:'골고다',         sub:'빌라도 · 십자가 · 매장' },
    { ch:16, title:'부활과 승천',    sub:'빈 무덤 · 부활 · 승천' },
];

// 스테이지 노드 좌표 (퍼센트) - 아래에서 위로, 지그재그
const STAGE_POSITIONS = [
    { x: 78, y: 92.9 }, { x: 50, y: 87.1 }, { x: 22, y: 81.6 }, { x: 50, y: 76.1 },
    { x: 78, y: 70.6 }, { x: 50, y: 65.2 }, { x: 22, y: 59.7 }, { x: 50, y: 54.2 },
    { x: 78, y: 48.7 }, { x: 50, y: 43.2 }, { x: 22, y: 37.7 }, { x: 50, y: 32.3 },
    { x: 78, y: 26.8 }, { x: 50, y: 21.3 }, { x: 22, y: 15.8 }, { x: 50, y: 11.0 },
];

const JOURNEY_KEY = "bible-quiz-journey-v1";

// 통과 기준: 총 문제 수의 2/3 이상 정답 (최소 1)
function passThreshold(total) {
    return Math.max(1, Math.ceil(total * 2 / 3));
}

// 진행도 스키마: { cleared: Set<chapterNum>, last: idx(0-15), count: 3|5|'all' }
function loadJourneyProgress() {
    try {
        const raw = localStorage.getItem(JOURNEY_KEY);
        if (!raw) return { cleared: new Set(), last: 0, count: 3 };
        const d = JSON.parse(raw);
        let cleared;
        if (typeof d.cleared === "number") {
            // 구버전 호환: {cleared: N} → 1~N 완주
            cleared = new Set();
            for (let i = 1; i <= d.cleared; i++) cleared.add(i);
        } else if (Array.isArray(d.cleared)) {
            cleared = new Set(d.cleared.filter(n => Number.isInteger(n) && n >= 1 && n <= 16));
        } else {
            cleared = new Set();
        }
        let count = 3;
        if (parseInt(d.count, 10) === 1) count = 1;
        return {
            cleared,
            last: Math.max(0, Math.min(15, parseInt(d.last, 10) || 0)),
            count
        };
    } catch (e) {
        return { cleared: new Set(), last: 0, count: 3 };
    }
}

function saveJourneyProgress(update) {
    const cur = loadJourneyProgress();
    const nextCleared = update.cleared !== undefined ? update.cleared : cur.cleared;
    const serialized = {
        cleared: Array.from(nextCleared).sort((a, b) => a - b),
        last: update.last !== undefined ? update.last : cur.last,
        count: update.count !== undefined ? update.count : cur.count
    };
    try { localStorage.setItem(JOURNEY_KEY, JSON.stringify(serialized)); } catch (e) {}
}

function resetJourneyProgress() {
    try { localStorage.removeItem(JOURNEY_KEY); } catch (e) {}
}

// 추가 화면 등록
screens.stageMap = document.getElementById("stage-map-screen");
screens.journey = document.getElementById("journey-complete-screen");

// 시작 화면 진행 힌트 갱신
function refreshStartHint() {
    const hint = document.getElementById("journey-progress-hint");
    if (!hint) return;
    const { cleared } = loadJourneyProgress();
    const n = cleared.size;
    if (n <= 0) hint.textContent = "";
    else if (n >= 16) hint.textContent = "✨ 마가복음 16장 완주 — 언제든 다시 시작하세요";
    else hint.textContent = `여정 진행: ${n} / 16 장`;
}
refreshStartHint();

// 버튼 연결
document.getElementById("journey-btn")?.addEventListener("click", openStageMap);
document.getElementById("stage-home-btn")?.addEventListener("click", () => {
    cleanupStageHud();
    state.mode = "bank";
    showScreen("start");
    refreshStartHint();
});
document.getElementById("stage-reset-btn")?.addEventListener("click", () => {
    if (confirm("여정 진행을 초기화할까요? (클리어 기록과 문제 수 설정이 사라집니다)")) {
        resetJourneyProgress();
        renderStageMap();
    }
});
document.getElementById("journey-again-btn")?.addEventListener("click", () => {
    resetJourneyProgress();
    openStageMap();
});
document.getElementById("journey-home-btn")?.addEventListener("click", () => {
    state.mode = "bank";
    showScreen("start");
    refreshStartHint();
});

// 문제수 선택 픽커 (1 또는 3)
document.querySelectorAll(".qcount-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const next = parseInt(btn.dataset.n, 10) === 1 ? 1 : 3;
        saveJourneyProgress({ count: next });
        renderStageMap();
    });
});

function openStageMap() {
    cleanupStageHud();
    state.mode = "stage";
    showScreen("stageMap");
    setTimeout(() => renderStageMap(), 400);
}

function chapterPool(ch) {
    return [...bankQuestions, ...examQuestions, ...examQuestions2].filter(q => q.chapter === ch);
}

function renderStageMap() {
    const prog = loadJourneyProgress();
    const clearedCount = prog.cleared.size;

    // 진행 바 갱신
    const fill = document.getElementById("journey-bar-fill");
    const label = document.getElementById("journey-progress-label");
    if (fill) fill.style.width = `${(clearedCount / 16) * 100}%`;
    if (label) label.textContent = `${clearedCount} / 16 장 완주`;

    // 문제수 픽커 상태
    document.querySelectorAll(".qcount-btn").forEach(btn => {
        btn.classList.toggle("selected", parseInt(btn.dataset.n, 10) === prog.count);
    });

    // 노드 재렌더 — 전 스테이지 모두 클릭 가능
    const nodesEl = document.getElementById("stage-nodes");
    if (!nodesEl) return;
    nodesEl.innerHTML = "";

    STAGE_CHAPTERS.forEach((meta, idx) => {
        const pos = STAGE_POSITIONS[idx];
        const node = document.createElement("div");
        node.className = "stage-node";
        node.style.left = `${pos.x}%`;
        node.style.top = `${pos.y}%`;

        if (prog.cleared.has(meta.ch)) node.classList.add("cleared");
        else node.classList.add("current");

        if (prog.last === idx) node.classList.add("here");

        const poolLen = chapterPool(meta.ch).length;
        node.innerHTML = `
            <div class="node-bubble">
                <span class="node-ch">${meta.ch}장</span>
                <span class="node-label">${meta.title}</span>
            </div>
            <div class="node-qcount">${poolLen}문제 보유</div>
        `;

        node.setAttribute("role", "button");
        node.setAttribute("tabindex", "0");
        node.addEventListener("click", () => startStage(idx));
        node.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); startStage(idx); }
        });
        nodesEl.appendChild(node);
    });

    // 예수 캐릭터 위치 — 마지막 방문/시작 스테이지
    const walker = document.getElementById("jesus-walker");
    if (walker) {
        if (clearedCount >= 16) {
            walker.style.left = "50%";
            walker.style.top = "4%";
        } else {
            const pos = STAGE_POSITIONS[prog.last];
            walker.style.left = `${pos.x}%`;
            walker.style.top = `${pos.y}%`;
        }
    }
}

function startStage(idx) {
    if (idx < 0 || idx > 15) return;
    const meta = STAGE_CHAPTERS[idx];
    const pool = chapterPool(meta.ch);
    if (pool.length < 1) {
        alert(`${meta.ch}장 문제가 없습니다.`);
        return;
    }

    const prog = loadJourneyProgress();
    const total = Math.max(1, Math.min(prog.count, pool.length));
    const passAt = passThreshold(total);

    state.mode = "stage";
    state.stageIdx = idx;
    state.stageChapter = meta.ch;
    state.stageTotal = total;
    state.stagePassAt = passAt;
    state.questions = shuffle(pool).slice(0, total);
    state.currentIndex = 0;
    state.score = 0;
    state.answers = [];

    saveJourneyProgress({ last: idx });

    injectStageHud(meta, total, passAt);

    showScreen("quiz");
    setTimeout(() => loadQuestion(), 400);
}

function injectStageHud(meta, total, passAt) {
    cleanupStageHud();
    const hud = document.createElement("div");
    hud.id = "stage-hud";
    hud.className = "stage-hud";
    hud.innerHTML = `
        <div class="stage-chapter">✝ 마가복음 ${meta.ch}장 — ${meta.title}</div>
        <div class="stage-title-small">${meta.sub} · ${total}문제 중 ${passAt}문제 이상 정답 시 통과</div>
    `;
    const quizPage = document.getElementById("quiz-page");
    const header = quizPage?.querySelector(".quiz-header");
    if (header && header.parentNode) {
        header.parentNode.insertBefore(hud, header.nextSibling);
    }
}

function cleanupStageHud() {
    const hud = document.getElementById("stage-hud");
    if (hud) hud.remove();
}

function handleStageEnd() {
    const meta = STAGE_CHAPTERS[state.stageIdx];
    const total = state.stageTotal ?? state.questions.length;
    const passAt = state.stagePassAt ?? passThreshold(total);
    const passed = state.score >= passAt;
    if (passed) {
        const prog = loadJourneyProgress();
        if (!prog.cleared.has(meta.ch)) {
            prog.cleared.add(meta.ch);
            saveJourneyProgress({ cleared: prog.cleared });
        }
    }
    showStageClearToast(passed, meta, total, passAt);
}

function showStageClearToast(passed, meta, total, passAt) {
    document.querySelector(".stage-clear-toast")?.remove();
    document.querySelector(".stage-clear-backdrop")?.remove();

    const backdrop = document.createElement("div");
    backdrop.className = "stage-clear-backdrop";
    document.body.appendChild(backdrop);

    const prog = loadJourneyProgress();
    const allCleared = prog.cleared.size >= 16;
    const isFinal = passed && allCleared;
    const remaining = 16 - prog.cleared.size;

    const toast = document.createElement("div");
    toast.className = "stage-clear-toast";

    // 액션 버튼 구성:
    //   통과 + 전장 완주 = [🕊 승천][🔁 다시풀기][🗺 여정맵]
    //   통과 = [▶ 다음][🔁 다시풀기][🗺 여정맵]
    //   실패 = [↻ 다시 도전][🗺 여정맵]
    let actionsHtml;
    if (!passed) {
        actionsHtml = `
            <button class="clear-continue" id="retry-stage-btn">↻ 다시 도전</button>
            <button class="clear-retry" id="back-map-btn">🗺 여정 맵으로</button>
        `;
    } else if (isFinal) {
        actionsHtml = `
            <button class="clear-continue" id="to-ascend-btn">🕊 승천으로 나아가기</button>
            <button class="clear-retry" id="replay-stage-btn">🔁 다시 풀기</button>
            <button class="clear-retry" id="back-map-btn">🗺 여정 맵으로</button>
        `;
    } else {
        actionsHtml = `
            <button class="clear-continue" id="next-stage-btn">▶ 다음</button>
            <button class="clear-retry" id="replay-stage-btn">🔁 다시 풀기</button>
            <button class="clear-retry" id="back-map-btn">🗺 여정 맵으로</button>
        `;
    }

    toast.innerHTML = `
        <h3>${passed ? (isFinal ? "✝ 여정 완주!" : "✨ 장 통과!") : "조금 더 묵상해보세요"}</h3>
        <div class="clear-score">${state.score} / ${total}</div>
        <p class="clear-msg">${passed
            ? `<strong>${meta.ch}장 — ${meta.title}</strong><br>${isFinal
                ? "마가복음 16장을 모두 완주하셨습니다!<br>승천으로 나아가세요."
                : `총 <strong>${prog.cleared.size}</strong> / 16 장 완주 · 남은 ${remaining}장`}`
            : `<strong>${meta.ch}장 — ${meta.title}</strong><br>${passAt}문제 이상 맞혀야 통과됩니다.<br>말씀을 되새기며 다시 도전해보세요.`}
        </p>
        <div class="clear-actions">${actionsHtml}</div>
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        backdrop.classList.add("active");
        toast.classList.add("active");
    });

    const cleanup = () => {
        toast.classList.remove("active");
        backdrop.classList.remove("active");
        setTimeout(() => { toast.remove(); backdrop.remove(); }, 400);
    };

    document.getElementById("next-stage-btn")?.addEventListener("click", () => {
        const nextIdx = (state.stageIdx + 1) % 16;
        cleanup();
        setTimeout(() => startStage(nextIdx), 300);
    });
    document.getElementById("retry-stage-btn")?.addEventListener("click", () => {
        const idx = state.stageIdx;
        cleanup();
        setTimeout(() => startStage(idx), 300);
    });
    document.getElementById("replay-stage-btn")?.addEventListener("click", () => {
        const idx = state.stageIdx;
        cleanup();
        setTimeout(() => startStage(idx), 300);
    });
    document.getElementById("to-ascend-btn")?.addEventListener("click", () => {
        cleanup();
        setTimeout(() => showAscension(), 400);
    });
    document.getElementById("back-map-btn")?.addEventListener("click", () => {
        cleanup();
        cleanupStageHud();
        showScreen("stageMap");
        setTimeout(() => renderStageMap(), 400);
    });
}

function showAscension() {
    cleanupStageHud();
    showScreen("journey");
    // 승천 애니메이션 재실행 (요소 교체로 animation 재시작)
    const oldJesus = document.getElementById("ascension-jesus");
    if (oldJesus && oldJesus.parentNode) {
        const clone = oldJesus.cloneNode(true);
        oldJesus.parentNode.replaceChild(clone, oldJesus);
    }
    const text = document.querySelector(".ascension-text");
    const actions = document.querySelector(".ascension-actions");
    [text, actions].forEach(el => {
        if (!el) return;
        el.style.animation = "none";
        // reflow
        void el.offsetWidth;
        el.style.animation = "";
    });
}

