import { appState, SECTION_REGISTRY } from './state.js';
import { pickRandom, resetQuestionCursor } from './utils.js';
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

export function startPracticeMode() {
  const inlineMessage = document.getElementById("inlineMessage");
  const practiceMockActions = document.getElementById("practiceMockActions");
  const practiceSectionScreen = document.getElementById("practiceSectionScreen");
  const practiceSectionList = document.getElementById("practiceSectionList");

  inlineMessage.classList.add("hidden");
  practiceMockActions.classList.add("hidden");
  practiceSectionScreen.classList.remove("hidden");
  
  practiceSectionList.innerHTML = "";
  Object.values(SECTION_REGISTRY).forEach(sec => {
    const btn = document.createElement("button");
    btn.className = "btn btn-outline";
    btn.textContent = `${sec.id} - ${sec.title}`;
    btn.addEventListener("click", () => {
      appState.currentScreen = "practice";
      generatePracticeSet(sec.id, appState.studyProfile);
    });
    practiceSectionList.appendChild(btn);
  });
}

export function generatePracticeSet(sectionId, studyProfile) {
  const reg = SECTION_REGISTRY[sectionId];
  let pool = appState.scopedBank[sectionId] || [];
  
  if (sectionId === "H" && studyProfile.mode !== "free_candidate") {
    pool = pool.filter(task => task._isReviewed === true);
  }
  
  const profileScope = studyProfile.scope[sectionId] || {};
  const count = profileScope.randomCount || reg.practiceCount || 1;
  
  const selected = pickRandom(pool, count);
  renderPracticeSet(sectionId, selected, reg);
}

export function renderPracticeSet(sectionId, practiceData, reg) {
  document.querySelector(".hero").classList.add("hidden");
  const examRoot = document.getElementById("examRoot");
  examRoot.classList.remove("hidden");
  examRoot.innerHTML = "";
  resetQuestionCursor();

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.marginBottom = "20px";
  header.innerHTML = `
    <button id="btnBackToMenu" class="btn btn-outline">← Back</button>
    <button id="btnNewPractice" class="btn btn-primary">Luyện lượt mới</button>
  `;
  examRoot.appendChild(header);

  header.querySelector("#btnBackToMenu").addEventListener("click", () => {
    examRoot.classList.add("hidden");
    document.querySelector(".hero").classList.remove("hidden");
    appState.currentScreen = "practice-mock-choice";
    document.getElementById("practiceMockActions").classList.remove("hidden");
    document.getElementById("practiceSectionScreen").classList.add("hidden");
  });
  
  header.querySelector("#btnNewPractice").addEventListener("click", () => {
    generatePracticeSet(sectionId, appState.studyProfile);
  });

  const title = `Phần ${sectionId} - ${reg.title}`;
  
  if (!reg.autoScored || !reg.answerKeyAvailable) {
    const notice = document.createElement("div");
    notice.style.padding = "12px";
    notice.style.backgroundColor = "#fff3e0";
    notice.style.borderLeft = "4px solid #ff9800";
    notice.style.marginBottom = "20px";
    notice.innerHTML = `<strong>Lưu ý:</strong> Phần này hiện chưa hỗ trợ chấm điểm tự động hoặc chưa có answer key. Không tính vào điểm.`;
    examRoot.appendChild(notice);
  }

  if (sectionId === "A") {
    renderMultipleChoiceGroup(title, "A", practiceData, examRoot);
  } else if (sectionId === "B") {
    renderMultipleChoiceGroup(title, "B", practiceData, examRoot, true);
  } else if (sectionId === "C") {
    practiceData.forEach(p => renderReadingPassage(p, examRoot));
  } else if (sectionId === "D") {
    practiceData.forEach(p => renderClozeText(p, examRoot));
  } else if (sectionId === "E") {
    renderTransformation(practiceData, examRoot);
  } else if (sectionId === "H") {
    renderListeningFill(practiceData, examRoot);
  } else if (sectionId === "I") {
    renderListeningMCQManual(practiceData, examRoot);
  } else if (sectionId === "J") {
    renderListeningTFManual(practiceData, examRoot);
  } else {
    renderManualSection(title, sectionId, practiceData, examRoot);
  }
}
