const BLUEPRINT = {
  A: 10,
  B: 5,
  C: 1,
  D: 1,
  E: 5,
  F: 1,
  G: 2,
  H: 2
};

const SECTION_LABELS = {
  A: "Vocabulary",
  B: "Signs",
  C: "Reading",
  D: "Cloze Text",
  E: "Transformation",
  F: "Listening Fill",
  G: "Listening ABC",
  H: "True / False",
};

let questionCursor = 1;
let examState = null;

const examRoot = document.getElementById("examRoot");
const summaryRoot = document.getElementById("examSummary");
const datasetStatus = document.getElementById("datasetStatus");
const btnGenerate = document.getElementById("btnGenerate");

btnGenerate.addEventListener("click", initExam);

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

initExam();

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

  showSection("A");
}

function showSection(key) {
  examRoot.querySelectorAll(".section-block").forEach((el) => {
    el.classList.toggle("hidden", el.dataset.section !== key);
  });
  examRoot.querySelectorAll(".sec-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.sec === key);
  });
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
        <div style="display: flex; align-items: baseline; gap: 8px;">
          ${q.prefix ? `<span class="prefix" style="font-weight: 600; color: var(--accent);">${escapeHtml(q.prefix)}</span>` : ""}
          <input class="answer-input" type="text" name="q_E_${q.id}" placeholder="Nhập đáp án..." style="flex: 1;" />
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
