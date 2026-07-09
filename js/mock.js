import { appState, SECTION_REGISTRY } from './state.js';
import { pickRandom, resetQuestionCursor, escapeHtml, normalizeText } from './utils.js';
import { 
  renderMultipleChoiceGroup, 
  renderReadingPassage, 
  renderClozeText, 
  renderTransformation, 
  renderListeningFill, 
  renderListeningMCQManual, 
  renderListeningTFManual, 
  renderManualSection 
} from './renderers.js';

let examState = null;

export function startMockExam() {
  const inlineMessage = document.getElementById("inlineMessage");
  const practiceMockActions = document.getElementById("practiceMockActions");
  const practiceSectionScreen = document.getElementById("practiceSectionScreen");

  inlineMessage.classList.add("hidden");
  practiceMockActions.classList.add("hidden");
  practiceSectionScreen.classList.add("hidden");
  appState.currentScreen = "mock";
  generateMockExam(appState.studyProfile);
}

export function generateMockExam(studyProfile) {
  const state = {
    generatedAt: new Date().toISOString(),
    A: pickRandom(appState.scopedBank.A || [], SECTION_REGISTRY.A.mockCount),
    B: pickRandom(appState.scopedBank.B || [], SECTION_REGISTRY.B.mockCount),
    C: pickRandom(appState.scopedBank.C || [], SECTION_REGISTRY.C.mockCount),
    D: pickRandom(appState.scopedBank.D || [], SECTION_REGISTRY.D.mockCount),
    E: pickRandom(appState.scopedBank.E || [], SECTION_REGISTRY.E.mockCount),
    F: pickRandom(appState.scopedBank.F || [], SECTION_REGISTRY.F.mockCount),
    G: pickRandom(appState.scopedBank.G || [], SECTION_REGISTRY.G.mockCount),
    H: pickRandom(appState.scopedBank.H || [], SECTION_REGISTRY.H.mockCount),
    I: pickRandom(appState.scopedBank.I || [], SECTION_REGISTRY.I.mockCount),
    J: pickRandom(appState.scopedBank.J || [], SECTION_REGISTRY.J.mockCount),
    K: pickRandom(appState.scopedBank.K || [], SECTION_REGISTRY.K.mockCount),
  };
  examState = state;
  renderMockExam(state);
}

export function renderMockExam(state) {
  const examRoot = document.getElementById("examRoot");
  const summaryRoot = document.getElementById("examSummary");
  
  document.querySelector(".hero").classList.add("hidden");
  examRoot.classList.remove("hidden");
  summaryRoot.classList.add("hidden");
  examRoot.innerHTML = "";
  resetQuestionCursor();

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.marginBottom = "20px";
  header.innerHTML = `
    <button id="btnBackToMenuMock" class="btn btn-outline">← Thoát Mock Exam</button>
    <h3 style="margin: 0; color: var(--accent);">Mock Exam</h3>
  `;
  examRoot.appendChild(header);

  header.querySelector("#btnBackToMenuMock").addEventListener("click", () => {
    if (!confirm("Bạn có chắc muốn thoát Mock Exam?")) return;
    examRoot.classList.add("hidden");
    summaryRoot.classList.add("hidden");
    document.querySelector(".hero").classList.remove("hidden");
    appState.currentScreen = "practice-mock-choice";
    document.getElementById("practiceMockActions").classList.remove("hidden");
  });

  renderMultipleChoiceGroup("Phần A - Vocabulary & Grammar", "A", state.A, examRoot);
  renderMultipleChoiceGroup("Phần B - Signs", "B", state.B, examRoot, true);
  state.C.forEach(p => renderReadingPassage(p, examRoot));
  state.D.forEach(p => renderClozeText(p, examRoot));
  renderTransformation(state.E, examRoot);

  renderManualSection("Phần F - Email Writing", "F", state.F, examRoot);
  renderManualSection("Phần G - Essay Writing", "G", state.G, examRoot);
  
  renderListeningFill(state.H, examRoot);
  
  renderListeningMCQManual(state.I, examRoot);
  renderListeningTFManual(state.J, examRoot);
  renderManualSection("Phần K - Speaking", "K", state.K, examRoot);

  const footer = document.createElement("div");
  footer.style.marginTop = "30px";
  footer.style.textAlign = "center";
  footer.innerHTML = `<button id="btnSubmitMock" class="btn btn-primary" style="font-size: 1.2rem; padding: 12px 30px;">Nộp Bài</button>`;
  examRoot.appendChild(footer);

  document.getElementById("btnSubmitMock").addEventListener("click", () => {
    if (confirm("Xác nhận nộp bài?")) {
      submitMockExam();
    }
  });
}

export function submitMockExam() {
  const examRoot = document.getElementById("examRoot");
  const summaryRoot = document.getElementById("examSummary");
  
  document.getElementById("btnSubmitMock").style.display = "none";
  let totalCorrect = 0;
  let totalScorable = 0;

  const scorableQuestions = examRoot.querySelectorAll('.section-block[data-section="A"], .section-block[data-section="B"], .section-block[data-section="C"], .section-block[data-section="D"], .section-block[data-section="E"]');
  
  scorableQuestions.forEach(sec => {
    const questions = sec.querySelectorAll(".question");
    questions.forEach(node => {
      const type = node.dataset.type;
      const answer = node.dataset.answer;
      if (answer === undefined || answer === "null") return;
      if (type !== "mcq" && type !== "text") return;
      
      totalScorable++;
      let isCorrect = false;
      let userValue = "";

      if (type === "mcq") {
        const checked = node.querySelector("input[type='radio']:checked");
        userValue = checked ? checked.value : "";
        isCorrect = userValue === answer;
      } else if (type === "text") {
        const input = node.querySelector("input[type='text']");
        userValue = input ? input.value : "";
        const acceptedAnswers = answer.split("|");
        isCorrect = acceptedAnswers.some((a) => normalizeText(userValue) === normalizeText(a));
      }

      let correctAnswerText = answer.includes("|") ? answer.split("|")[0] : answer;
      if (type === "mcq") {
        const correctInput = node.querySelector(`input[value="${answer}"]`);
        if (correctInput && correctInput.parentElement) {
          correctAnswerText = correctInput.parentElement.textContent.trim();
        }
      }

      let existingResult = node.querySelector(".immediate-result");
      if (!existingResult) {
        existingResult = document.createElement("div");
        existingResult.className = "immediate-result";
        node.appendChild(existingResult);
      }

      if (isCorrect) {
        totalCorrect++;
        existingResult.innerHTML = `<span class="good">✔ Đúng!</span>`;
        existingResult.style.borderLeftColor = "var(--ok)";
      } else {
        existingResult.innerHTML = `<span class="bad">✘ Sai. Đáp án đúng: ${escapeHtml(correctAnswerText)}</span>`;
        existingResult.style.borderLeftColor = "var(--bad)";
      }
    });
  });

  summaryRoot.classList.remove("hidden");
  summaryRoot.innerHTML = `
    <h2 style="margin-bottom: 15px; color: var(--accent);">Kết quả Mock Exam</h2>
    <span class="kpi"><span class="badge">Điểm tự động</span> ${totalCorrect} / ${totalScorable}</span>
    <p style="margin-top: 15px; font-size: 0.95rem; color: #555;">
      <strong>Lưu ý:</strong> Điểm tự động chỉ tính các phần A, B, C, D, E.<br/>
      Các phần F, G, H, I, J, K không tính điểm tự động và cần chấm thủ công.
    </p>
  `;
  window.scrollTo({ top: 0, behavior: "smooth" });
}
