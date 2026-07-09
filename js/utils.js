let questionCursor = 1;

export function resetQuestionCursor() {
  questionCursor = 1;
}

export function nextQn() {
  const value = questionCursor;
  questionCursor += 1;
  return value;
}

export function pickRandom(list, count) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.min(count, arr.length));
}

export function normalizeText(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderQuestion(text) {
  return escapeHtml(text).replace(/______/g, '<span class="blank">______</span>');
}

export function renderPassage(text) {
  return escapeHtml(text).replace(/\((\d+)\)/g, '<span class="cloze-blank">($1)</span>');
}

export function sectionBlock(title, sectionKey) {
  const block = document.createElement("section");
  block.className = "section-block";
  if (sectionKey) block.dataset.section = sectionKey;
  block.innerHTML = `<h3 class="section-title">${escapeHtml(title)}</h3>`;
  return block;
}

export function normalizeOptions(q) {
  if (!q.options) return [];
  if (Array.isArray(q.options)) return q.options;
  if (typeof q.options === "object") {
    if (q.options.A !== undefined) {
      const arr = [];
      const keys = Object.keys(q.options).sort();
      for (const k of keys) arr.push(q.options[k]);
      return arr;
    }
    return Object.values(q.options);
  }
  return [];
}

export function getQuestionText(q) {
  if (q.question) return q.question;
  if (q.prompt) return q.prompt;
  if (q.text) return q.text;
  if (q.sentence) return q.sentence;
  if (q.originalSentence) return q.originalSentence;
  if (q.gappedSentence) return q.gappedSentence;
  if (q.original) return q.original;
  return "N/A";
}

export function getAnswerIndex(q) {
  const ans = q.answerIndex !== undefined ? q.answerIndex : (q.correctOption || q.correctAnswer || q.answerLetter || q.answer);
  if (ans === null || ans === undefined) return null;
  if (typeof ans === "number") return ans;
  if (typeof ans === "string") {
    const map = { A: 0, B: 1, C: 2, D: 3, a: 0, b: 1, c: 2, d: 3 };
    if (map[ans] !== undefined) return map[ans];
  }
  return null;
}

export function getNumericIdOrder(item) {
  const match = String(item.id || "").match(/(\d+)/);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}
