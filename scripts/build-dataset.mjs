import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve("d:/Tin/B1 - CEFR/OnTap_B1");
const sourcePath = path.resolve(
  "d:/Tin/B1 - CEFR/TargetMDDirectory/File_on_tap_B1_13.06.2026/File_on_tap_B1_13.06.2026.md"
);
const targetPath = path.join(repoRoot, "data", "exam-data.json");
const reportPath = path.join(repoRoot, "data", "build-report.json");

const markdown = fs.readFileSync(sourcePath, "utf8");
const base = JSON.parse(fs.readFileSync(targetPath, "utf8"));

function stripMd(text) {
  return text
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/_{3,}/g, "[[BLANK]]")              // 3+ underscores = blank
    .replace(/_\*{2}[^*\n]*\*{2}/g, "[[BLANK]]") // _**...**  = blank (DOCX underline-blank)
    .replace(/\)\*+/g, ") ")                      // (N)****word → (N) word (cloze blanks)
    .replace(/[*_#`>]/g, "")
    .replace(/\[\[BLANK\]\]/g, " ______ ")
    .replace(/\s+/g, " ")
    .trim();
}

// Join passage lines preserving paragraph breaks (blank lines → "\n").
function buildPassageText(rawLines) {
  const paras = [];
  let cur = [];
  for (const line of rawLines) {
    const s = stripMd(line);
    if (!s) {
      if (cur.length) { paras.push(cur.join(" ")); cur = []; }
    } else {
      cur.push(s);
    }
  }
  if (cur.length) paras.push(cur.join(" "));
  return paras.join("\n");
}

function sectionBetween(startMarker, endMarker) {
  const start = markdown.indexOf(startMarker);
  if (start === -1) return "";
  if (!endMarker) return markdown.slice(start);
  const end = markdown.indexOf(endMarker, start + startMarker.length);
  if (end === -1) return "";
  return markdown.slice(start, end);
}

// ── splitABCOptions ──────────────────────────────────────────────────────────
// Handles both inline "A...B...C..." and separate-line formats.
// Uses ** parity to detect which option is correct.
function splitABCOptions(rawLines) {
  const joined = rawLines.join(" ");
  const bIdx = joined.indexOf("B.");
  const cIdx = joined.indexOf("C.");

  if (bIdx > -1 && cIdx > bIdx) {
    const rawA = joined.slice(0, bIdx);
    const rawB = joined.slice(bIdx + 2, cIdx);
    const rawC = joined.slice(cIdx + 2);
    const options = [rawA, rawB, rawC].map((x) =>
      stripMd(x).replace(/^[ABC]\./, "").trim()
    );

    // Parity-based correct-answer detection:
    // odd count of ** before a letter boundary → that letter is opening bold → it's correct.
    const countStars = (str) => (str.match(/\*\*/g) || []).length;
    const starsBeforeB = countStars(joined.slice(0, bIdx));
    const starsBeforeC = countStars(joined.slice(0, cIdx));

    let answerIndex = 0;
    if (starsBeforeB % 2 === 1) {
      answerIndex = 1;
    } else if (starsBeforeC % 2 === 1) {
      answerIndex = 2;
    } else if (joined.trimStart().startsWith("**")) {
      answerIndex = 0;
    }

    return { options, answerIndex };
  }

  // Separate-line format: one line per option; the bold heading is the correct answer.
  const normalized = rawLines.map((x) => stripMd(x)).filter(Boolean);
  const options = normalized.slice(0, 3);
  let answerIndex = rawLines.findIndex((x) => x.includes("**"));
  if (answerIndex < 0 || answerIndex > 2) answerIndex = 0;
  return { options, answerIndex };
}

// ── Section A ─────────────────────────────────────────────────────────────────
function parseSectionA() {
  const block = sectionBetween(
    "### **Choose the best possible answer A, B, C or D for each sentence below.**",
    "## **B. Signs**"
  );
  const lines = block.split(/\r?\n/);
  const out = [];

  for (let i = 0; i < lines.length; i += 1) {
    const qMatch = lines[i].match(/^(\d+)\.\s+(.+)$/);
    if (!qMatch) continue;

    const qNo = Number(qMatch[1]);
    const question = stripMd(qMatch[2]);

    let optionLine = "";
    for (let j = i + 1; j < Math.min(i + 12, lines.length); j += 1) {
      if (/^\d+\.\s+/.test(lines[j])) break;
      if (!/[ABCD]\./.test(lines[j])) continue;

      const candidates = [];
      for (let k = j; k < Math.min(j + 4, lines.length); k += 1) {
        if (/^\d+\.\s+/.test(lines[k])) break;
        if (!lines[k].trim()) continue;
        candidates.push(lines[k].trim());
        const joined = candidates.join(" ");
        if (/A\./.test(joined) && /B\./.test(joined) && /C\./.test(joined) && /D\./.test(joined)) {
          optionLine = joined;
          break;
        }
      }

      if (optionLine) break;
    }

    if (!optionLine) continue;
    const parsed = parseOptionsLine(optionLine);
    if (parsed.options.length !== 4) continue;

    out.push({
      id: `A${String(qNo).padStart(3, "0")}`,
      question,
      options: parsed.options,
      answerIndex: parsed.answerIndex
    });
  }

  return out.slice(0, 100);
}

function parseOptionsLine(rawLine) {
  const cleaned = stripMd(rawLine);
  const options = [];
  const re = /([ABCD])\.\s*(.*?)(?=(?:\s*[ABCD]\.\s)|$)/g;
  let m;
  while ((m = re.exec(cleaned)) !== null) {
    options.push(m[2].trim());
  }

  // Parity-based detection for ABCD (same approach as splitABCOptions for ABC).
  // Count ** occurrences before each letter boundary.
  // Odd parity = bold is "open" at that position = that letter starts in bold = it's the answer.
  const countStars = (str) => (str.match(/\*\*/g) || []).length;
  const aPos = rawLine.indexOf("A.");
  const bPos = aPos > -1 ? rawLine.indexOf("B.", aPos + 1) : -1;
  const cPos = bPos > -1 ? rawLine.indexOf("C.", bPos + 1) : -1;
  const dPos = cPos > -1 ? rawLine.indexOf("D.", cPos + 1) : -1;

  const sA = aPos > -1 ? countStars(rawLine.slice(0, aPos)) : 0;
  const sB = bPos > -1 ? countStars(rawLine.slice(0, bPos)) : 0;
  const sC = cPos > -1 ? countStars(rawLine.slice(0, cPos)) : 0;
  const sD = dPos > -1 ? countStars(rawLine.slice(0, dPos)) : 0;

  let answerIndex = 0;
  if (sD % 2 === 1) answerIndex = 3;
  else if (sC % 2 === 1) answerIndex = 2;
  else if (sB % 2 === 1) answerIndex = 1;
  else if (sA % 2 === 1) answerIndex = 0;

  return { options, answerIndex };
}

// ── Section B (Signs) ─────────────────────────────────────────────────────────
function parseSectionB() {
  const block = sectionBetween("## **B. Signs**", "## **2. Reading Comprehension**");
  const lines = block.split(/\r?\n/);

  const imgRe = /!\[[^\]]*\]\((images\/[^)]+)\)/;

  // Collect all image occurrences with their line index and path.
  const imageEntries = [];
  for (let i = 0; i < lines.length; i++) {
    const m = imgRe.exec(lines[i]);
    if (m) {
      imageEntries.push({ lineIdx: i, imagePath: m[1], rawLine: lines[i] });
    }
  }

  const out = [];

  for (let q = 0; q < imageEntries.length; q++) {
    const entry = imageEntries[q];
    const startLine = entry.lineIdx;
    const endLine = q + 1 < imageEntries.length ? imageEntries[q + 1].lineIdx : lines.length;

    const optionLines = [];

    // If the image line contains option text beyond just the image and question number,
    // extract it as an option.
    // Case A: heading line (### **...**) → correct answer (e.g. Q5 where image is in the answer)
    // Case B: plain line with trailing text → wrong option (e.g. Q6 "Do not forget...")
    const imgLine = entry.rawLine.trim();
    const isImgLineHeading = /^#+/.test(imgLine) && imgLine.includes("**");
    const withoutImgText = imgLine.replace(imgRe, "");
    const imgLineText = stripMd(withoutImgText)
      .replace(/^\*{0,4}/, "")
      .replace(/\d+\.?\s*$/, "")
      .replace(/^\*{0,4}$/, "")
      .trim();
    if (imgLineText.length > 3) {
      optionLines.push({ text: imgLineText, isCorrect: isImgLineHeading });
    }

    // Collect lines between this image and the next.
    for (let i = startLine + 1; i < endLine; i++) {
      const raw = lines[i].trim();
      if (!raw) continue;
      if (imgRe.test(raw)) continue; // a nested image line

      const isHeading = /^#+/.test(raw);
      const text = stripMd(raw);

      // Skip pure question-number lines like "## **5.**" or "**4.**" or "1."
      if (/^\d+\.?\s*$/.test(text)) continue;
      if (/^\*{0,2}\d+\.\*{0,2}\s*$/.test(text)) continue;
      if (text.length < 3) continue;

      const isCorrect = isHeading && raw.includes("**");
      optionLines.push({ text, isCorrect });
    }

    const correctIdx = optionLines.findIndex((o) => o.isCorrect);
    if (correctIdx < 0 || optionLines.length < 3) continue;

    const qNo = out.length + 1;
    out.push({
      id: `B${String(qNo).padStart(3, "0")}`,
      image: entry.imagePath,
      question: "What does this sign mean?",
      options: optionLines.map((o) => o.text),
      answerIndex: correctIdx
    });
  }

  return out.slice(0, 40);
}

// ── Section D ─────────────────────────────────────────────────────────────────
function parseSectionD() {
  const block = sectionBetween("## **B. Cloze text**", "## **WRITING**");
  const textBlocks = block.split(/###\s*\*\*TEXT/).slice(1);
  const clozeTexts = [];

  for (const tb of textBlocks) {
    const raw = `### **TEXT${tb}`;
    const titleMatch = raw.match(/##\s*\*\*([^\n*]+)\*\*/);
    const title = titleMatch ? stripMd(titleMatch[1]) : "Cloze Text";

    const lines = raw.split(/\r?\n/);
    const tableLines = lines.filter((l) => l.trim().startsWith("|"));
    const blanks = [];

    for (const line of tableLines) {
      const row = line.split("|").map((x) => x.trim()).filter(Boolean);
      if (row.length < 5 || !/^\d+\./.test(row[0])) continue;
      const blankNo = Number(row[0].replace(".", "").trim());

      const rawCells = row.slice(1, 5);
      const options = rawCells.map((c) => stripMd(c).replace(/^[ABCD]\./, "").trim());
      let answerIndex = rawCells.findIndex((c) => c.includes("**"));
      if (answerIndex < 0) answerIndex = 0;

      blanks.push({
        id: `${title.replace(/\s+/g, "_")}_B${blankNo}`,
        blankNo,
        options,
        answerIndex
      });
    }

    if (blanks.length > 0) {
      const rawPassageLines = [];
      for (const line of lines) {
        if (line.trim().startsWith("|")) break;
        if (/^##\s*\*\*/.test(line)) continue;
        if (/^###\s*\*\*TEXT/.test(line)) continue;
        rawPassageLines.push(line);
      }
      clozeTexts.push({
        id: `D_${clozeTexts.length + 1}`,
        title,
        text: buildPassageText(rawPassageLines),
        blanks: blanks.slice(0, 10)
      });
    }
  }

  return clozeTexts.slice(0, 4);
}

// ── Section E ─────────────────────────────────────────────────────────────────
function parseSectionE() {
  const block = sectionBetween("## **1. Sentence Transformation**", "## **2. Composition**");
  const re = /\*\*(\d+)\.\s*\*\*([^\n]+?)\(([^)]+)\)\s*\n\s*\n\*→([^\n]+)/g;
  const out = [];
  let m;

  while ((m = re.exec(block)) !== null) {
    const qNo = Number(m[1]);
    const prompt = stripMd(m[2]);
    const keyword = stripMd(m[3]);
    const rawAns = m[4].replace(/^→\s*/, "").trim();
    const firstBoldIdx = rawAns.indexOf("**");
    let prefix = "";
    let finalAnswer = "";

    if (firstBoldIdx !== -1) {
      prefix = stripMd(rawAns.slice(0, firstBoldIdx)).trim();
      finalAnswer = stripMd(rawAns.slice(firstBoldIdx)).trim();
    } else {
      prefix = "";
      finalAnswer = stripMd(rawAns).trim();
    }

    out.push({
      id: `E${String(qNo).padStart(3, "0")}`,
      prompt,
      keyword,
      prefix,
      answer: finalAnswer
    });
  }

  return out.slice(0, 30);
}

// ── Section F ─────────────────────────────────────────────────────────────────
function parseSectionF() {
  const block = sectionBetween("## **Fill the blanks**", "## **Choose ABC**");
  const textBlocks = block.split(/###\s*\*\*TEXT/).slice(1);
  const out = [];

  for (const tb of textBlocks) {
    const raw = `### **TEXT${tb}`;
    // Use the ### TEXT line as title (not the ## passage subtitle which belongs in the text body).
    const titleLine = raw.split(/\r?\n/)[0];
    const title = stripMd(titleLine) || "Listening Fill";

    // Parse answers line by line.
    // Each answer line has one or two "N. **answer**" entries (two-column format).
    // Only process lines that START with a digit (answer key lines), skipping passage text.
    // Uses negative-lookahead to capture the full segment up to the next "M. ",
    // then stripMd to handle split-bold like **App****a****rently**.
    const answers = [];
    for (const line of raw.split(/\r?\n/)) {
      const stripped = line.trim();
      if (!/^\d+\./.test(stripped)) continue; // skip non-answer lines
      const segRe = /(\d+)\.\s+((?:(?!\d+\.\s)[^\n])*?)(?=\d+\.\s|$)/g;
      let m;
      while ((m = segRe.exec(stripped)) !== null) {
        const blankNo = Number(m[1]);
        if (blankNo < 1 || blankNo > 10) continue;
        const answer = stripMd(m[2])
          .replace(/\s*\([^)]*\)\s*/g, " ")
          .trim();
        if (answer) answers.push({ blankNo, answer });
      }
    }

    // Deduplicate: keep first occurrence of each blank number.
    const seen = new Set();
    const deduped = answers.filter((a) => !seen.has(a.blankNo) && seen.add(a.blankNo));

    if (deduped.length === 0) continue;

    const rawTextLines = [];
    for (const line of raw.split(/\r?\n/)) {
      if (/^\d+\.\s*\*\*/.test(line.trim())) break;
      if (/^###\s*\*\*TEXT/.test(line)) continue;
      rawTextLines.push(line);
    }

    out.push({
      id: `F_${out.length + 1}`,
      title,
      text: buildPassageText(rawTextLines),
      blanks: deduped
        .sort((a, b) => a.blankNo - b.blankNo)
        .slice(0, 10)
        .map((a, idx) => ({ id: `F${out.length + 1}B${idx + 1}`, blankNo: a.blankNo, answer: a.answer }))
    });
  }

  return out.slice(0, 3);
}

// ── Section G (Choose ABC) ────────────────────────────────────────────────────
// Fix: no longer break when seeing ### **...** lines — those are correct answers.
// Fix: use improved splitABCOptions with parity-based detection.
function parseSectionG() {
  const block = sectionBetween("## **Choose ABC**", "## **True-False**");
  const chunks = block
    .split(/###\s*\*\*TEXT/)
    .slice(1)
    .map((c) => `### **TEXT${c}`);

  const out = [];
  for (const chunk of chunks) {
    const lines = chunk.split(/\r?\n/).map((l) => l.trim());
    const titleLine = lines.find((l) => l.startsWith("###")) || "TEXT";
    const title = stripMd(titleLine).replace(/^TEXT\s*/, "TEXT ");

    const questions = [];
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line || line.startsWith("###") || line.startsWith("##")) continue;

      // Find next non-empty line to detect inline-ABC option format.
      let nextNonEmpty = "";
      for (let k = i + 1; k < lines.length; k++) {
        if (lines[k].trim()) { nextNonEmpty = lines[k]; break; }
      }
      const followedByInlineABC = /B\./.test(nextNonEmpty) && /C\./.test(nextNonEmpty);

      // A question is: ends with ? OR it's a fill-in sentence followed by inline ABC options.
      if (!line.endsWith("?") && !followedByInlineABC) continue;

      const qText = stripMd(line);
      const optionLines = [];
      let j = i + 1;

      while (j < lines.length) {
        const next = lines[j];
        if (!next) { j += 1; continue; }

        // Stop at a new TEXT block or outer section header.
        if (/^###\s*\*\*TEXT\s*\d+/.test(next)) break;
        if (next.startsWith("## **True-False**")) break;

        // Check if the NEXT line after this one looks like a question start.
        let nextOfNext = "";
        for (let k = j + 1; k < lines.length; k++) {
          if (lines[k].trim()) { nextOfNext = lines[k]; break; }
        }
        const nextFollowedByInlineABC = /B\./.test(nextOfNext) && /C\./.test(nextOfNext);

        // Stop at a new question (ends with ? or fill-in-sentence before inline ABC).
        if (optionLines.length > 0 && !next.startsWith("#")) {
          if (next.endsWith("?")) break;
          if (nextFollowedByInlineABC) break;
        }

        // Collect this as an option (includes ### **...** correct-answer lines).
        optionLines.push(next);
        if (optionLines.length >= 3) break;
        j += 1;
      }

      if (optionLines.length === 0) continue;
      const parsed = splitABCOptions(optionLines);
      if (parsed.options.length !== 3) continue;

      questions.push({
        id: `G${out.length + 1}Q${questions.length + 1}`,
        question: qText,
        options: parsed.options,
        answerIndex: parsed.answerIndex
      });
      i = j - 1;
    }

    if (questions.length > 0) {
      out.push({
        id: `G_TEXT_${out.length + 1}`,
        title,
        questions: questions.slice(0, 5)
      });
    }
  }

  return out.slice(0, 4);
}

// ── Section H (True-False) ────────────────────────────────────────────────────
function parseSectionH() {
  const block = sectionBetween("## **True-False**", "");
  if (!block) return [];

  const chunks = block
    .split(/###\s*\*\*TEXT/)
    .slice(1)
    .map((c) => `### **TEXT${c}`);

  const out = [];

  for (const chunk of chunks) {
    const titleLine = chunk.split(/\r?\n/).find((l) => l.trim().startsWith("###")) || "TEXT";
    const title = stripMd(titleLine).replace(/^TEXT\s*/, "TEXT ");
    const lines = chunk.split(/\r?\n/);
    const statements = [];

    for (let i = 0; i < lines.length; i += 1) {
      const current = lines[i].trim();
      if (!current) continue;
      if (current.startsWith("###")) continue;
      if (/^##\s*\*\*/.test(current)) continue;
      if (/^True|^\*\*True/.test(current)) continue;

      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j += 1;
      if (j >= lines.length) continue;

      const ansLine = lines[j].trim();
      if (!/True/.test(ansLine) || !/False/.test(ansLine)) continue;

      const answer = ansLine.includes("**True**") ? "True" : "False";
      statements.push({
        id: `H${out.length + 1}S${statements.length + 1}`,
        statement: stripMd(current),
        answer
      });
      i = j;
    }

    if (statements.length > 0) {
      out.push({
        id: `H_TEXT_${out.length + 1}`,
        title,
        statements: statements.slice(0, 5)
      });
    }
  }

  return out.slice(0, 4);
}

// ── Run all parsers ───────────────────────────────────────────────────────────
const parsedA = parseSectionA();
const parsedB = parseSectionB();
const parsedD = parseSectionD();
const parsedE = parseSectionE();
const parsedF = parseSectionF();
const parsedG = parseSectionG();
const parsedH = parseSectionH();

base.A.vocabularyGrammar = parsedA.length ? parsedA : base.A.vocabularyGrammar;
base.B.signs = parsedB.length ? parsedB : base.B.signs;
base.D.clozeTexts = parsedD.length ? parsedD : base.D.clozeTexts;
base.E.sentenceTransformation = parsedE.length ? parsedE : base.E.sentenceTransformation;
base.F.fillInBlanks = parsedF.length ? parsedF : base.F.fillInBlanks;
base.G.chooseABC = parsedG.length ? parsedG : base.G.chooseABC;
base.H.trueFalse = parsedH.length ? parsedH : base.H.trueFalse;

base.meta.source = "Generated from File_on_tap_B1_13.06.2026.md";
base.meta.generatedAt = new Date().toISOString();
base.meta.poolCounts = {
  A: base.A.vocabularyGrammar.length,
  B: base.B.signs.length,
  C: base.C.readingPassages.length,
  D: base.D.clozeTexts.length,
  E: base.E.sentenceTransformation.length,
  F: base.F.fillInBlanks.length,
  G: base.G.chooseABC.length,
  H: base.H.trueFalse.length
};

fs.writeFileSync(targetPath, `${JSON.stringify(base, null, 2)}\n`, "utf8");
fs.writeFileSync(
  reportPath,
  `${JSON.stringify(
    {
      generatedAt: base.meta.generatedAt,
      sourcePath,
      counts: base.meta.poolCounts,
      extracted: {
        A: parsedA.length,
        B: parsedB.length,
        D: parsedD.length,
        E: parsedE.length,
        F: parsedF.length,
        G: parsedG.length,
        H: parsedH.length
      }
    },
    null,
    2
  )}\n`,
  "utf8"
);

console.log("Dataset rebuilt.");
console.log(base.meta.poolCounts);
