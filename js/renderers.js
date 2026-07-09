import { appState } from './state.js';
import { 
  escapeHtml, renderPassage, normalizeOptions, getQuestionText, 
  getAnswerIndex, renderQuestion, nextQn, sectionBlock 
} from './utils.js';

export function renderMultipleChoiceGroup(title, sectionKey, questions, parent, includeImage = false) {
  const block = sectionBlock(title, sectionKey);
  questions.forEach((q) => {
    const qn = nextQn();
    const opts = normalizeOptions(q);
    if (!opts || opts.length === 0) {
      block.insertAdjacentHTML("beforeend", `<div class="manual-notice" style="margin-bottom: 15px;">Lỗi data: Câu ${escapeHtml(q.id)} thiếu options</div>`);
      return;
    }
    
    const ansIdx = getAnswerIndex(q);
    const answerAttr = ansIdx !== null ? `data-answer="${ansIdx}"` : "";

    const optionsHTML = opts
      .map(
        (opt, idx) => `<label><input type="radio" name="q_${sectionKey}_${q.id}" value="${idx}"> ${escapeHtml(opt)}</label>`
      )
      .join("");

    block.insertAdjacentHTML(
      "beforeend",
      `<div class="question" data-type="mcq" ${answerAttr} data-key="${sectionKey}_${q.id}" data-qn="${qn}">
        <h4>Câu ${qn}. ${renderQuestion(getQuestionText(q))}</h4>
        ${includeImage && (q.image || q.path || q.imagePath) ? `<img class="sign-image" src="${escapeHtml(q.image || q.path || q.imagePath)}" alt="sign-${escapeHtml(q.id)}" />` : ""}
        <div class="options">${optionsHTML}</div>
      </div>`
    );
  });
  parent.appendChild(block);
}

export function renderReadingPassage(reading, parent) {
  const block = sectionBlock("Phần 1C - Reading Passage", "C");
  block.insertAdjacentHTML(
    "beforeend",
    `<p class="passage-title">${escapeHtml(reading.title || "")}</p>
     <div class="passage">${escapeHtml(reading.passage || "")}</div>`
  );

  (reading.questions || []).forEach((q) => {
    const qn = nextQn();
    const opts = normalizeOptions(q);
    if (!opts || opts.length === 0) {
      block.insertAdjacentHTML("beforeend", `<div class="manual-notice" style="margin-bottom: 15px;">Lỗi data: Câu ${escapeHtml(q.id)} thiếu options</div>`);
      return;
    }
    const ansIdx = getAnswerIndex(q);
    const answerAttr = ansIdx !== null ? `data-answer="${ansIdx}"` : "";

    block.insertAdjacentHTML(
      "beforeend",
      `<div class="question" data-type="mcq" ${answerAttr} data-key="C_${q.id}" data-qn="${qn}">
        <h4>Câu ${qn}. ${escapeHtml(getQuestionText(q))}</h4>
        <div class="options">${opts
          .map((opt, idx) => `<label><input type="radio" name="q_C_${q.id}" value="${idx}"> ${escapeHtml(opt)}</label>`)
          .join("")}</div>
      </div>`
    );
  });

  parent.appendChild(block);
}

export function renderClozeText(cloze, parent) {
  const block = sectionBlock("Phần 1D - Cloze Text", "D");
  block.insertAdjacentHTML(
    "beforeend",
    `<p class="passage-title">${escapeHtml(cloze.title || "")}</p>
     <div class="passage">${renderPassage(cloze.text || cloze.passage || "")}</div>`
  );

  const LETTERS = ["A", "B", "C", "D"];
  let rows = "";
  const items = cloze.questions || cloze.blanks || [];
  items.forEach((q) => {
    const qn = nextQn();
    const opts = normalizeOptions(q);
    if (!opts || opts.length === 0) {
      rows += `<tr><td colspan="5"><div class="manual-notice">Lỗi data: Câu ${escapeHtml(q.id)} thiếu options</div></td></tr>`;
      return;
    }
    const ansIdx = getAnswerIndex(q);
    const answerAttr = ansIdx !== null ? `data-answer="${ansIdx}"` : "";

    const cells = opts
      .map((opt, idx) => `<td><label><input type="radio" name="q_D_${q.id}" value="${idx}"> ${LETTERS[idx] || idx}. ${escapeHtml(opt)}</label></td>`)
      .join("");
      
    rows += `<tr class="question cloze-row" data-type="mcq" ${answerAttr} data-key="D_${q.id}" data-qn="${qn}">
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

export function renderTransformation(items, parent) {
  const block = sectionBlock("Phần 2E - Sentence Transformation", "E");

  items.forEach((q) => {
    const qn = nextQn();
    const ans = q.answer || q.correctAnswer || "";
    const answerAttr = ans ? `data-answer="${escapeHtml(ans)}"` : "";

    block.insertAdjacentHTML(
      "beforeend",
      `<div class="question" data-type="text" ${answerAttr} data-key="E_${q.id}" data-qn="${qn}">
        <h4>Câu ${qn}. ${escapeHtml(getQuestionText(q))}</h4>
        ${q.transformedPrompt ? `<p style="margin-top: 4px; font-weight: 500;">${escapeHtml(q.transformedPrompt)}</p>` : ""}
        <div class="meta">Keyword: ${escapeHtml(q.keyword || "")}</div>
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

export function renderListeningMCQManual(groups, parent) {
  const block = sectionBlock("Phần I - Listening MCQ", "I");

  groups.forEach((group) => {
    block.insertAdjacentHTML(
      "beforeend",
      `<p class="passage-title">${escapeHtml(group.title || group.id)}</p>
       ${group.audio || group.audioPath ? `<audio controls src="${escapeHtml(group.audio || group.audioPath)}" style="width: 100%; margin: 10px 0; border-radius: 8px;"></audio>` : ""}
       ${group.transcript || group.text || group.passage ? `<div class="passage">${renderPassage(group.transcript || group.text || group.passage)}</div>` : ""}`
    );

    (group.questions || []).forEach((q) => {
      const qn = nextQn();
      const opts = normalizeOptions(q);
      
      const optionsHTML = opts
        .map(
          (opt, idx) => `<label><input type="radio" name="q_I_${q.id || qn}" value="${idx}"> ${escapeHtml(opt)}</label>`
        )
        .join("");

      block.insertAdjacentHTML(
        "beforeend",
        `<div class="manual-question" data-key="I_${q.id || qn}" data-qn="${qn}" style="margin-bottom: 15px;">
          <h4>Câu ${qn}. ${renderQuestion(getQuestionText(q))}</h4>
          ${optionsHTML ? `<div class="options">${optionsHTML}</div>` : ""}
        </div>`
      );
    });
  });

  parent.appendChild(block);
}

export function renderListeningTFManual(groups, parent) {
  const block = sectionBlock("Phần J - Listening True/False", "J");

  groups.forEach((group) => {
    block.insertAdjacentHTML(
      "beforeend",
      `<p class="passage-title">${escapeHtml(group.title || group.id)}</p>
       ${group.audio || group.audioPath ? `<audio controls src="${escapeHtml(group.audio || group.audioPath)}" style="width: 100%; margin: 10px 0; border-radius: 8px;"></audio>` : ""}
       ${group.transcript || group.text || group.passage ? `<div class="passage">${renderPassage(group.transcript || group.text || group.passage)}</div>` : ""}`
    );

    (group.statements || group.questions || []).forEach((q) => {
      const qn = nextQn();
      const text = q.statement || getQuestionText(q);
      
      block.insertAdjacentHTML(
        "beforeend",
        `<div class="manual-question" data-key="J_${q.id || qn}" data-qn="${qn}" style="margin-bottom: 15px;">
          <h4>Câu ${qn}. ${escapeHtml(text)}</h4>
          <div class="options">
            <label><input type="radio" name="q_J_${q.id || qn}" value="T"> True</label>
            <label><input type="radio" name="q_J_${q.id || qn}" value="F"> False</label>
          </div>
        </div>`
      );
    });
  });

  parent.appendChild(block);
}

export function renderManualSection(title, sectionKey, items, parent) {
  const block = sectionBlock(title, sectionKey);
  items.forEach(item => {
    block.insertAdjacentHTML("beforeend", `<div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ccc; border-radius: 8px;">
      <h4>ID: ${escapeHtml(item.id)}</h4>
      ${item.prompt ? `<p><strong>Prompt:</strong> ${escapeHtml(item.prompt)}</p>` : ""}
      ${item.passage ? `<div class="passage">${escapeHtml(item.passage)}</div>` : ""}
      ${item.transcript ? `<div class="passage">${escapeHtml(item.transcript)}</div>` : ""}
      ${item.guidingQuestions ? `<ul>${item.guidingQuestions.map(q => `<li>${escapeHtml(q)}</li>`).join('')}</ul>` : ""}
      <p><em>(Dữ liệu đang được hiển thị dạng basic - manual review)</em></p>
    </div>`);
  });
  parent.appendChild(block);
}

export function renderListeningFill(texts, parent) {
  const block = sectionBlock("Phần H - Listening Fill in Blanks", "H");
  
  texts.forEach((fill) => {
    let titleHtml = escapeHtml(fill.title || fill.id);
    if (appState.currentScreen === "mock" && fill._isRisk) {
      titleHtml += ` <span style="background: #ef5350; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; margin-left: 8px;">Chưa ôn / Risk</span>`;
    }

    block.insertAdjacentHTML(
      "beforeend",
      `<p class="passage-title">${titleHtml}</p>
       ${fill.audio ? `<audio controls src="${fill.audio}" style="width: 100%; margin: 10px 0; border-radius: 8px;"></audio>` : ""}
       <div class="passage">${renderPassage(fill.transcript || fill.text || "")}</div>`
    );

    (fill.blanks || []).forEach((q) => {
      const qn = nextQn();
      block.insertAdjacentHTML(
        "beforeend",
        `<div class="manual-question" data-key="H_${fill.id}_${q.blankNumber}" data-qn="${qn}" style="margin-bottom: 15px;">
          <h4>Câu ${qn}. Blank (${q.blankNumber || q.blankNo})</h4>
          <input class="answer-input" type="text" name="q_H_${fill.id}_${q.blankNumber}" placeholder="Nhập từ/cụm từ..." />
        </div>`
      );
    });
  });

  parent.appendChild(block);
}
