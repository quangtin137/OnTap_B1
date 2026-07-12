import { appState } from './js/state.js';
import { loadAllParsedData, buildStudyProfile, getScopedBank } from './js/data.js';
import { startPracticeMode } from './js/practice.js';
import { startMockExam } from './js/mock.js';
import { normalizeText, escapeHtml } from './js/utils.js';
import { renderScopeUI, initScopeUI } from './js/scope-ui.js';

const modeSelectionScreen = document.getElementById("modeSelectionScreen");
const practiceMockScreen = document.getElementById("practiceMockScreen");
const selectedModeLabel = document.getElementById("selectedModeLabel");
const practiceMockActions = document.getElementById("practiceMockActions");
const btnPractice = document.getElementById("btnPractice");
const btnMockExam = document.getElementById("btnMockExam");
const inlineMessage = document.getElementById("inlineMessage");
const datasetStatus = document.getElementById("datasetStatus");
const examRoot = document.getElementById("examRoot");

document.querySelectorAll(".btn-mode").forEach(btn => {
  btn.addEventListener("click", async (e) => {
    const mode = e.target.dataset.mode;
    await handleModeSelection(mode, e.target.textContent);
  });
});

btnPractice.addEventListener("click", () => {
  startPracticeMode();
});

btnMockExam.addEventListener("click", () => {
  startMockExam();
});

async function handleModeSelection(modeId, modeName) {
  datasetStatus.textContent = "Đang tải dữ liệu...";
  datasetStatus.classList.remove("bad");
  
  if (!appState.isDataLoaded) {
    try {
      await loadAllParsedData();
    } catch (e) {
      datasetStatus.textContent = "Lỗi khi tải dữ liệu: " + e.message;
      datasetStatus.classList.add("bad");
      return;
    }
  }
  
  appState.selectedMode = modeId;
  appState.studyProfile = buildStudyProfile(modeId);
  appState.scopedBank = getScopedBank(appState.examBank, appState.studyProfile);
  appState.currentScreen = "practice-mock-choice";
  
  modeSelectionScreen.classList.add("hidden");
  selectedModeLabel.textContent = modeName;
  practiceMockScreen.classList.remove("hidden");
  inlineMessage.classList.add("hidden");
  datasetStatus.textContent = "Dữ liệu đã được tải thành công.";
  
  renderScopeUI();
}

examRoot.addEventListener("change", (e) => {
  if (appState.currentScreen === "mock") return;
  const node = e.target.closest(".question");
  if (!node) return;

  const type = node.dataset.type;
  const answer = node.dataset.answer;
  if (answer === undefined || answer === "null") return;

  let userValue = "";
  let isCorrect = false;

  if (type === "mcq" || type === "tf") {
    if (e.target.type !== "radio") return;
    userValue = e.target.value;
    isCorrect = userValue === answer;
  } else if (type === "text") {
    if (e.target.tagName !== "INPUT" || e.target.type !== "text") return;
    userValue = e.target.value;
    const acceptedAnswers = answer.split("|");
    isCorrect = acceptedAnswers.some((a) => normalizeText(userValue) === normalizeText(a));
  }

  let correctAnswerText = answer.includes("|") ? answer.split("|")[0] : answer;
  if (type === "mcq" || type === "tf") {
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
    existingResult.innerHTML = `<span class="good">✔ Đúng!</span>`;
    existingResult.style.borderLeftColor = "var(--ok)";
  } else {
    existingResult.innerHTML = `<span class="bad">✘ Sai. Đáp án đúng: ${escapeHtml(correctAnswerText)}</span>`;
    existingResult.style.borderLeftColor = "var(--bad)";
  }
});

initScopeUI();
