const SECTION_REGISTRY = {
  A: { id: "A", title: "Vocabulary & Grammar MCQ", type: "mcq", autoScored: true, answerKeyAvailable: true, practiceCount: 10, mockCount: 10 },
  B: { id: "B", title: "Signs MCQ with image", type: "signs_mcq", autoScored: true, answerKeyAvailable: true, practiceCount: 5, mockCount: 5 },
  C: { id: "C", title: "Reading passage MCQ group", type: "reading_group", autoScored: true, answerKeyAvailable: true, practiceCount: 1, mockCount: 1 },
  D: { id: "D", title: "Cloze text MCQ group", type: "cloze_group", autoScored: true, answerKeyAvailable: true, practiceCount: 1, mockCount: 1 },
  E: { id: "E", title: "Sentence transformation", type: "sentence_transformation", autoScored: true, answerKeyAvailable: true, practiceCount: 10, mockCount: 5 },
  F: { id: "F", title: "Email/Letter writing", type: "email_writing", autoScored: false, answerKeyAvailable: false, practiceCount: 1, mockCount: 1 },
  G: { id: "G", title: "Essay writing", type: "essay_writing", autoScored: false, answerKeyAvailable: false, practiceCount: 1, mockCount: 1 },
  H: { id: "H", title: "Listening fill blanks", type: "listening_fill_blanks", autoScored: false, answerKeyAvailable: false, practiceCount: 1, mockCount: 1 },
  I: { id: "I", title: "Listening MCQ", type: "listening_abc", autoScored: false, answerKeyAvailable: false, practiceCount: 1, mockCount: 2 },
  J: { id: "J", title: "Listening True/False", type: "listening_tf", autoScored: false, answerKeyAvailable: false, practiceCount: 1, mockCount: 2 },
  K: { id: "K", title: "Speaking topics", type: "speaking_topic", autoScored: false, answerKeyAvailable: false, practiceCount: 1, mockCount: 1 }
};

const appState = {
  examBank: null,
  scopedBank: null,
  studyProfile: null,
  selectedMode: null,
  currentScreen: "mode-selection",
  isDataLoaded: false,
  loadErrors: []
};
window.__ONTAP_B1_STATE__ = appState;

// Note: Old blueprint and section labels retained for backward compatibility of old renderer logic if needed later, but they are not used for new F1-F2 flow.
const BLUEPRINT = { A: 10, B: 5, C: 1, D: 1, E: 5, F: 1, G: 2, H: 2 };
const SECTION_LABELS = { A: "Vocabulary", B: "Signs", C: "Reading", D: "Cloze Text", E: "Transformation", F: "Listening Fill", G: "Listening ABC", H: "True / False" };

let questionCursor = 1;
let examState = null;

const examRoot = document.getElementById("examRoot");
const summaryRoot = document.getElementById("examSummary");
const datasetStatus = document.getElementById("datasetStatus");

const modeSelectionScreen = document.getElementById("modeSelectionScreen");
const practiceMockScreen = document.getElementById("practiceMockScreen");
const selectedModeLabel = document.getElementById("selectedModeLabel");
const btnPractice = document.getElementById("btnPractice");
const btnMockExam = document.getElementById("btnMockExam");
const inlineMessage = document.getElementById("inlineMessage");

document.querySelectorAll(".btn-mode").forEach(btn => {
  btn.addEventListener("click", async (e) => {
    const mode = e.target.dataset.mode;
    await handleModeSelection(mode, e.target.textContent);
  });
});

btnPractice.addEventListener("click", () => {
  inlineMessage.textContent = "Practice Mode sẽ được triển khai ở Phase F4.";
  inlineMessage.classList.remove("hidden");
});

btnMockExam.addEventListener("click", () => {
  inlineMessage.textContent = "Mock Exam migration sẽ được triển khai ở Phase F5.";
  inlineMessage.classList.remove("hidden");
});

examRoot.addEventListener("change", (e) => {
  const node = e.target.closest(".question");
  if (!node) return;

  const type = node.dataset.type;
  const answer = node.dataset.answer;

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

// initExam(); // Disabled for Phase F1/F2 new flow

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
}

function buildAllScope() {
  const scope = {};
  const sections = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];
  sections.forEach(s => {
    scope[s] = { type: "all" };
  });
  return scope;
}

function buildStudyProfile(mode) {
  const scope = buildAllScope();
  if (mode === "free_candidate") {
    return { mode, scope };
  } else if (mode === "two_week") {
    scope.E = { type: "range", from: 1, to: 25, randomCount: 10 };
    scope.H = { 
      type: "selection", 
      officialPoolIndexes: [0, 1, 2], 
      reviewedIndexes: [0, 1], 
      unreviewedIndexes: [2], 
      randomCount: 1 
    };
    return { mode, scope };
  } else if (mode === "four_week") {
    scope.E = { type: "range", from: 1, to: 30, randomCount: 10 };
    scope.H = { 
      type: "selection", 
      officialPoolIndexes: [0, 1, 2], 
      reviewedIndexes: [0, 1, 2], 
      unreviewedIndexes: [], 
      randomCount: 1 
    };
    return { mode, scope };
  }
  return { mode, scope };
}

function getNumericIdOrder(item) {
  const match = String(item.id || "").match(/(\d+)/);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function getScopedBank(examBank, studyProfile) {
  const scoped = {};
  const sections = Object.keys(examBank);
  
  sections.forEach(s => {
    const scopeData = studyProfile.scope[s];
    if (!scopeData || scopeData.type === "all") {
      scoped[s] = [...examBank[s]];
    } else if (scopeData.type === "range") {
      let items = [...examBank[s]];
      items.sort((a, b) => {
        if (a.questionNumber !== undefined && b.questionNumber !== undefined) {
          return a.questionNumber - b.questionNumber;
        }
        const numA = getNumericIdOrder(a);
        const numB = getNumericIdOrder(b);
        if (numA !== Number.POSITIVE_INFINITY || numB !== Number.POSITIVE_INFINITY) {
          return numA - numB;
        }
        return 0;
      });
      scoped[s] = items.slice(scopeData.from - 1, scopeData.to);
    } else if (scopeData.type === "selection") {
      let pool = [];
      scopeData.officialPoolIndexes.forEach(idx => {
        if (examBank[s][idx]) {
          let clone = { ...examBank[s][idx] };
          if (scopeData.reviewedIndexes && scopeData.reviewedIndexes.includes(idx)) {
            clone._isReviewed = true;
          } else {
            clone._isReviewed = false;
          }
          if (scopeData.unreviewedIndexes && scopeData.unreviewedIndexes.includes(idx)) {
            clone._isRisk = true;
          }
          pool.push(clone);
        }
      });
      scoped[s] = pool;
    }
  });
  
  return scoped;
}

async function loadAllParsedData() {
  const sections = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"];
  const bank = {};
  appState.loadErrors = [];
  
  for (const s of sections) {
    try {
      const res = await fetch(`data/parsed/section-${s}.json`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      
      let items = [];
      if (Array.isArray(data)) {
        items = data;
      } else if (data.data && Array.isArray(data.data)) {
        items = data.data;
      } else {
        items = [data];
      }
      
      const filtered = items.filter(item => item.usable !== false);
      bank[s.toUpperCase()] = filtered;
    } catch (e) {
      console.error(`Failed to load section ${s}:`, e);
      appState.loadErrors.push(`Section ${s.toUpperCase()}: ${e.message}`);
    }
  }
  
  if (appState.loadErrors.length > 0) {
    throw new Error("Không thể tải một số files dữ liệu.");
  }
  
  appState.examBank = bank;
  appState.isDataLoaded = true;
}

// Old unused initialization logic preserved
async function initExam() {
  try {
    const bank = await fetch("data/exam-data.json").then((r) => r.json());
    examState = buildExam(bank);
    renderSummary(bank);
    renderExam(examState);
  } catch (error) {
    examRoot.innerHTML = `<p class="bad">Không thể tải dữ liệu: ${escapeHtml(error.message)}</p>`;
  }
}

function buildExam(bank) {
  questionCursor = 1;

  const chosenPassage = pickRandom(bank.C.readingPassages, BLUEPRINT.C)[0];
  const chosenCloze = pickRandom(bank.D.clozeTexts, BLUEPRINT.D)[0];
  const chosenFill = pickRandom(bank.F.fillInBlanks, BLUEPRINT.F)[0];
  const chosenABCTexts = pickRandom(bank.G.chooseABC, BLUEPRINT.G);
  const chosenTFTexts = pickRandom(bank.H.trueFalse, BLUEPRINT.H);

  const state = {
    generatedAt: new Date().toISOString(),
    A: pickRandom(bank.A.vocabularyGrammar, BLUEPRINT.A),
    B: pickRandom(bank.B.signs, BLUEPRINT.B),
    C: chosenPassage,
    D: chosenCloze,
    E: pickRandom(bank.E.sentenceTransformation, BLUEPRINT.E),
    F: chosenFill,
    G: chosenABCTexts,
    H: chosenTFTexts,
    totalScorable: 0
  };

  state.totalScorable += state.A.length;
  state.totalScorable += state.B.length;
  state.totalScorable += state.C.questions.length;
  state.totalScorable += state.D.blanks.length;
  state.totalScorable += state.E.length;
  state.totalScorable += state.F.blanks.length;
  state.totalScorable += state.G.reduce((sum, t) => sum + t.questions.length, 0);
  state.totalScorable += state.H.reduce((sum, t) => sum + t.statements.length, 0);

  return state;
}

function renderSummary(bank) {
  const pool = bank.meta.poolCounts;
  const shortages = [];

  Object.keys(BLUEPRINT).forEach((k) => {
    if ((pool[k] || 0) < BLUEPRINT[k]) {
      shortages.push(`${k}: pool ${pool[k] || 0} < need ${BLUEPRINT[k]}`);
    }
  });

  datasetStatus.textContent = shortages.length
    ? `Seed mode: dữ liệu hiện chưa đủ pool chuẩn. ${shortages.join(" | ")}`
    : "Dataset đủ pool chuẩn theo blueprint.";

  summaryRoot.classList.remove("hidden");
  summaryRoot.innerHTML = `
    <span class="kpi"><span class="badge">Blueprint</span> A10 • B5 • C1 • D1 • E5 • F1 • G2 • H2</span>
    <span class="kpi"><span class="badge">Tổng câu chấm điểm</span> ${examState.totalScorable}</span>
    <span class="kpi"><span class="badge">Sinh đề lúc</span> ${new Date(examState.generatedAt).toLocaleString()}</span>
  `;
}

function renderExam(state) {
  examRoot.innerHTML = "";

  // Section tab navigation
  const nav = document.createElement("nav");
  nav.className = "section-nav";
  Object.entries(SECTION_LABELS).forEach(([key, label]) => {
    const btn = document.createElement("button");
    btn.className = "sec-btn";
    btn.dataset.sec = key;
    btn.textContent = `${key} · ${label}`;
    btn.addEventListener("click", () => showSection(key));
    nav.appendChild(btn);
  });
  examRoot.appendChild(nav);

  renderMultipleChoiceGroup("Phần 1A - Vocabulary & Grammar", "A", state.A, examRoot);
  renderMultipleChoiceGroup("Phần 1B - Signs", "B", state.B, examRoot, true);
  renderReadingPassage(state.C, examRoot);
  renderClozeText(state.D, examRoot);
  renderTransformation(state.E, examRoot);
  renderFillBlanks(state.F, examRoot);
  renderChooseABC(state.G, examRoot);
  renderTrueFalse(state.H, examRoot);

  renderSectionFooterNav();
  showSection("A");
}

function renderSectionFooterNav() {
  const keys = Object.keys(SECTION_LABELS);
  keys.forEach((key, idx) => {
    const block = examRoot.querySelector(`.section-block[data-section="${key}"]`);
    if (!block) return;

    const nav = document.createElement("div");
    nav.className = "section-footer-nav";

    const prevKey = keys[idx - 1];
    const nextKey = keys[idx + 1];

    if (prevKey) {
      const btn = document.createElement("button");
      btn.className = "sec-nav-btn sec-nav-prev";
      btn.textContent = `← ${prevKey} · ${SECTION_LABELS[prevKey]}`;
      btn.addEventListener("click", () => showSection(prevKey));
      nav.appendChild(btn);
    } else {
      nav.appendChild(document.createElement("span"));
    }

    if (nextKey) {
      const btn = document.createElement("button");
      btn.className = "sec-nav-btn sec-nav-next";
      btn.textContent = `${nextKey} · ${SECTION_LABELS[nextKey]} →`;
      btn.addEventListener("click", () => showSection(nextKey));
      nav.appendChild(btn);
    }

    block.appendChild(nav);
  });
}

function showSection(key) {
  examRoot.querySelectorAll(".section-block").forEach((el) => {
    el.classList.toggle("hidden", el.dataset.section !== key);
  });
  examRoot.querySelectorAll(".sec-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.sec === key);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderMultipleChoiceGroup(title, sectionKey, questions, parent, includeImage = false) {
  const block = sectionBlock(title, sectionKey);
  questions.forEach((q) => {
    const qn = nextQn();
    const options = q.options
      .map(
        (opt, idx) => `<label><input type="radio" name="q_${sectionKey}_${q.id}" value="${idx}"> ${escapeHtml(opt)}</label>`
      )
      .join("");

    block.insertAdjacentHTML(
      "beforeend",
      `<div class="question" data-type="mcq" data-answer="${q.answerIndex}" data-key="${sectionKey}_${q.id}" data-qn="${qn}">
        <h4>Câu ${qn}. ${renderQuestion(q.question)}</h4>
        ${includeImage && q.image ? `<img class="sign-image" src="${escapeHtml(q.image)}" alt="sign-${escapeHtml(q.id)}" />` : ""}
        <div class="options">${options}</div>
      </div>`
    );
  });
  parent.appendChild(block);
}

function renderReadingPassage(reading, parent) {
  const block = sectionBlock("Phần 1C - Reading Passage", "C");
  block.insertAdjacentHTML(
    "beforeend",
    `<p class="passage-title">${escapeHtml(reading.title)}</p>
     <div class="passage">${escapeHtml(reading.passage)}</div>`
  );

  reading.questions.forEach((q) => {
    const qn = nextQn();
    block.insertAdjacentHTML(
      "beforeend",
      `<div class="question" data-type="mcq" data-answer="${q.answerIndex}" data-key="C_${q.id}" data-qn="${qn}">
        <h4>Câu ${qn}. ${escapeHtml(q.question)}</h4>
        <div class="options">${q.options
          .map((opt, idx) => `<label><input type="radio" name="q_C_${q.id}" value="${idx}"> ${escapeHtml(opt)}</label>`)
          .join("")}</div>
      </div>`
    );
  });

  parent.appendChild(block);
}

function renderClozeText(cloze, parent) {
  const block = sectionBlock("Phần 1D - Cloze Text", "D");
  block.insertAdjacentHTML(
    "beforeend",
    `<p class="passage-title">${escapeHtml(cloze.title)}</p>
     <div class="passage">${renderPassage(cloze.text)}</div>`
  );

  const LETTERS = ["A", "B", "C", "D"];
  let rows = "";
  cloze.blanks.forEach((q) => {
    const qn = nextQn();
    const cells = q.options
      .map((opt, idx) => `<td><label><input type="radio" name="q_D_${q.id}" value="${idx}"> ${LETTERS[idx]}. ${escapeHtml(opt)}</label></td>`)
      .join("");
    rows += `<tr class="question cloze-row" data-type="mcq" data-answer="${q.answerIndex}" data-key="D_${q.id}" data-qn="${qn}">
      <td class="cloze-num">${qn}.</td>
      ${cells}
    </tr>`;
  });

  block.insertAdjacentHTML(
    "beforeend",
    `<div class="cloze-table-wrap"><table class="cloze-table"><tbody>${rows}</tbody></table></div>`
  );

  parent.appendChild(block);
}

function renderTransformation(items, parent) {
  const block = sectionBlock("Phần 2E - Sentence Transformation", "E");

  items.forEach((q) => {
    const qn = nextQn();
    block.insertAdjacentHTML(
      "beforeend",
      `<div class="question" data-type="text" data-answer="${escapeHtml(q.answer)}" data-key="E_${q.id}" data-qn="${qn}">
        <h4>Câu ${qn}. ${escapeHtml(q.prompt)}</h4>
        <div class="meta">Keyword: ${escapeHtml(q.keyword)}</div>
        ${q.hint ? `<details style="margin-bottom: 12px; font-size: 0.9rem;"><summary style="color: var(--accent); font-weight: 600; cursor: pointer; outline: none; user-select: none;">💡 Xem gợi ý</summary><div style="margin-top: 6px; padding: 10px; background: #fffde7; border-left: 3px solid #fbc02d; border-radius: 4px; color: #424242; line-height: 1.5;">${escapeHtml(q.hint)}</div></details>` : ""}
        <div style="display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;">
          ${q.prefix ? `<span class="prefix" style="font-weight: 600; color: var(--accent); white-space: nowrap;">${escapeHtml(q.prefix)}</span>` : ""}
          <input class="answer-input" type="text" name="q_E_${q.id}" placeholder="Nhập đáp án..." style="flex: 1; min-width: 160px;" />
          ${q.suffix ? `<span style="font-weight: 600; color: var(--accent); white-space: nowrap;">${escapeHtml(q.suffix)}</span>` : ""}
        </div>
      </div>`
    );
  });

  parent.appendChild(block);
}

function renderFillBlanks(fill, parent) {
  const block = sectionBlock("Phần 3F - Listening Fill in Blanks", "F");
  block.insertAdjacentHTML(
    "beforeend",
    `<p class="passage-title">${escapeHtml(fill.title)}</p>
     ${fill.audio ? `<audio controls src="${fill.audio}" style="width: 100%; margin: 10px 0; border-radius: 8px;"></audio>` : ""}
     <div class="passage">${renderPassage(fill.text)}</div>`
  );

  fill.blanks.forEach((q) => {
    const qn = nextQn();
    block.insertAdjacentHTML(
      "beforeend",
      `<div class="question" data-type="text" data-answer="${escapeHtml(q.answer)}" data-key="F_${q.id}" data-qn="${qn}">
        <h4>Câu ${qn}. Blank (${q.blankNo})</h4>
        <input class="answer-input" type="text" name="q_F_${q.id}" placeholder="Nhập từ/cụm từ..." />
      </div>`
    );
  });

  parent.appendChild(block);
}

function renderChooseABC(texts, parent) {
  const block = sectionBlock("Phần 3G - Listening Choose ABC", "G");

  texts.forEach((text) => {
    block.insertAdjacentHTML(
      "beforeend",
      `<p class="meta">${escapeHtml(text.title)}</p>
       ${text.audio ? `<audio controls src="${text.audio}" style="width: 100%; margin: 10px 0 20px 0; border-radius: 8px;"></audio>` : ""}`
    );
    text.questions.forEach((q) => {
      const qn = nextQn();
      block.insertAdjacentHTML(
        "beforeend",
        `<div class="question" data-type="mcq" data-answer="${q.answerIndex}" data-key="G_${q.id}" data-qn="${qn}">
          <h4>Câu ${qn}. ${escapeHtml(q.question)}</h4>
          <div class="options">${q.options
            .map((opt, idx) => `<label><input type="radio" name="q_G_${q.id}" value="${idx}"> ${escapeHtml(opt)}</label>`)
            .join("")}</div>
        </div>`
      );
    });
  });

  parent.appendChild(block);
}

function renderTrueFalse(texts, parent) {
  const block = sectionBlock("Phần 3H - Listening True/False", "H");

  texts.forEach((text) => {
    block.insertAdjacentHTML(
      "beforeend",
      `<p class="meta">${escapeHtml(text.title)}</p>
       ${text.audio ? `<audio controls src="${text.audio}" style="width: 100%; margin: 10px 0 20px 0; border-radius: 8px;"></audio>` : ""}`
    );
    text.statements.forEach((s) => {
      const qn = nextQn();
      block.insertAdjacentHTML(
        "beforeend",
        `<div class="question" data-type="tf" data-answer="${s.answer}" data-key="H_${s.id}" data-qn="${qn}">
          <h4>Câu ${qn}. ${escapeHtml(s.statement)}</h4>
          <div class="options">
            <label><input type="radio" name="q_H_${s.id}" value="True"> True</label>
            <label><input type="radio" name="q_H_${s.id}" value="False"> False</label>
          </div>
        </div>`
      );
    });
  });

  parent.appendChild(block);
}



function sectionBlock(title, sectionKey) {
  const block = document.createElement("section");
  block.className = "section-block";
  if (sectionKey) block.dataset.section = sectionKey;
  block.innerHTML = `<h3 class="section-title">${escapeHtml(title)}</h3>`;
  return block;
}

function pickRandom(list, count) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.min(count, arr.length));
}

function nextQn() {
  const value = questionCursor;
  questionCursor += 1;
  return value;
}

function normalizeText(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Renders question text, replacing ______ with a styled underline blank.
function renderQuestion(text) {
  return escapeHtml(text).replace(/______/g, '<span class="blank">______</span>');
}

// Renders cloze/fill passage, highlighting (N) blank markers.
function renderPassage(text) {
  return escapeHtml(text).replace(/\((\d+)\)/g, '<span class="cloze-blank">($1)</span>');
}
