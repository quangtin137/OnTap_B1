import fs from 'fs';
import path from 'path';

const rawPath = path.resolve('data/raw/hutech-b1-review-09-2025.raw.txt');
const rawText = fs.readFileSync(rawPath, 'utf8');
const lines = rawText.split(/\r?\n/);

function cleanString(str) {
  return str
    .replace(/ΓÇÿ/g, "'")
    .replace(/ΓÇÖ/g, "'")
    .replace(/ΓÇ£/g, '"')
    .replace(/ΓÇ¥/g, '"')
    .replace(/ΓÇª/g, '...')
    .replace(/ΓÇô/g, '-')
    .replace(/ΓÇö/g, '-')
    .replace(/∩¼â/g, "ffi")
    .replace(/\\/g, '');
}

function cleanMarkdown(str) {
  if (!str) return str;
  let s = str.replace(/[\*\_]/g, '');
  s = s.replace(/[ \t]{2,}/g, ' ');
  return s.trim();
}

let listeningStartLine = -1;
let listeningEndLine = -1;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line === '__LISTENING__') {
    listeningStartLine = i;
  }
  if (listeningStartLine !== -1 && (line === 'SPEAKING TOPICS' || line === '__SPEAKING TOPICS__')) {
    listeningEndLine = i;
    break;
  }
}

const listeningLines = lines.slice(listeningStartLine, listeningEndLine).filter(l => !l.includes("data:image") && !l.includes("base64") && !l.includes("![]("));

const texts = [];
let currentText = null;

for (let i = 0; i < listeningLines.length; i++) {
  const rawLine = listeningLines[i];
  const cleanedLine = cleanString(rawLine);
  
  const match = cleanedLine.match(/^__TEXT\s+(\d+):/i) || cleanedLine.match(/^TEXT\s+(\d+):/i);
  if (match) {
    if (currentText) {
      texts.push(currentText);
    }
    currentText = {
      number: parseInt(match[1], 10),
      lines: [cleanedLine]
    };
  } else if (currentText) {
    currentText.lines.push(cleanedLine);
  }
}
if (currentText) {
  texts.push(currentText);
}

const H_FREE_FILL = [1,3,4,5,6,8,11,12,16,17,18,20,21,22,23,24,25,26,27,28,29,30];
const I_BLANK_MCQ = [2,9,15,19];
const I_QUESTION_MCQ = [7,10,13,14,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50];
const J_TRUE_FALSE = [2,4,8,11,18,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70];
const mixedTaskSourceTextNumbers = [2,4,8,11,18];

const hItems = [];
const iItems = [];
const jItems = [];

const audioDir = path.resolve('audio');
const availableAudios = fs.existsSync(audioDir) ? fs.readdirSync(audioDir) : [];

function getAudioPath(textNumber) {
  const fileName = `Text ${textNumber}.mp3`;
  return availableAudios.includes(fileName) ? `audio/${fileName}` : null;
}

let hCounter = 1;
let iCounter = 1;
let jCounter = 1;

function parseOptions(blockLines) {
  const optionsMap = new Map();
  const fullText = '\n' + blockLines.join('\n');
  
  const qBlocks = fullText.split(/(?=\n[ \r]*(?:__)?\d+\.(?:__)?(?!\s*True|\s*False))/);
  
  for (const block of qBlocks) {
    if (!block.trim()) continue;
    const numMatch = block.match(/^\s*(?:__)?(\d+)\.(?:__)?/);
    if (!numMatch) continue;
    const qNum = parseInt(numMatch[1], 10);
    
    const content = block.substring(numMatch[0].length);
    
    const matchB = content.match(/(?<=\s|^)(?:__)?(?:B\.|2\.)(?:__)?\s*/);
    if (!matchB) continue;
    
    const beforeB = content.substring(0, matchB.index);
    let afterB = content.substring(matchB.index + matchB[0].length);
    
    const matchA = [...beforeB.matchAll(/(?<=\s|^)(?:__)?(?:A\.|1\.)(?:__)?\s*/g)].pop();
    if (!matchA) continue;
    
    const prompt = beforeB.substring(0, matchA.index).trim();
    const optA = beforeB.substring(matchA.index + matchA[0].length).trim();
    
    const matchC = afterB.match(/(?<=\s|^)(?:__)?(?:C\.|3\.)(?:__)?\s*/);
    if (!matchC) continue;
    
    const optB = afterB.substring(0, matchC.index).trim();
    let afterC = afterB.substring(matchC.index + matchC[0].length);
    
    const matchD = afterC.match(/(?<=\s|^)(?:__)?(?:D\.|4\.)(?:__)?\s*/);
    let optCText = '';
    let optDText = '';
    if (matchD) {
      optCText = afterC.substring(0, matchD.index).trim();
      optDText = afterC.substring(matchD.index + matchD[0].length).trim();
    } else {
      optCText = afterC.trim();
    }
    
    let finalQNum = qNum;
    while (optionsMap.has(finalQNum)) {
      finalQNum++;
    }
    
    optionsMap.set(finalQNum, {
      prompt: cleanMarkdown(prompt),
      opts: {
        A: cleanMarkdown(optA),
        B: cleanMarkdown(optB),
        C: cleanMarkdown(optCText),
        ...(optDText ? { D: cleanMarkdown(optDText) } : {})
      }
    });
  }
  return optionsMap;
}

function parseTrueFalse(blockLines) {
  const statements = [];
  const fullText = '\n' + blockLines.join('\n');
  const qBlocks = fullText.split(/(?=\n\s*(?:__)?\d+\.(?:__)?\s+)/);
  
  for (const block of qBlocks) {
    if (!block.trim()) continue;
    const numMatch = block.match(/^\s*(?:__)?(\d+)\.(?:__)?\s+(.*)/s);
    if (!numMatch) continue;
    const stNum = parseInt(numMatch[1], 10);
    let text = numMatch[2];
    
    if (/^(?:(?:A\.|1\.)\s*)?True\s*\bB\.\s*False/is.test(text.trim()) || /^True\s*\bB\.\s*False/is.test(text.trim())) {
      continue;
    }
    
    text = text.replace(/(?:\bA\.|1\.)?\s*True\s*\bB\.\s*False.*/is, '');
    
    statements.push({
      statementNumber: stNum,
      statement: cleanMarkdown(text),
      options: { A: "True", B: "False" },
      answer: null
    });
  }
  
  const uniqueStatements = [];
  const seen = new Set();
  for (const s of statements) {
    if (!seen.has(s.statementNumber)) {
      seen.add(s.statementNumber);
      uniqueStatements.push(s);
    }
  }
  return uniqueStatements;
}

for (const text of texts) {
  const { number, lines } = text;
  const fullText = lines.join('\n');
  const audioPath = getAudioPath(number);
  
  let tfLines = [];
  let otherLines = [];
  
  if (J_TRUE_FALSE.includes(number)) {
    const ListenAgainIndex = lines.findIndex(l => /listen again/i.test(l) || /fill.*missing.*words/i.test(l));
    if (ListenAgainIndex > 0 && mixedTaskSourceTextNumbers.includes(number)) {
      tfLines = lines.slice(0, ListenAgainIndex);
      otherLines = lines.slice(ListenAgainIndex);
    } else {
      tfLines = lines;
    }
    
    const statements = parseTrueFalse(tfLines);
    if (statements.length > 0) {
      jItems.push({
        id: `J_${jCounter.toString().padStart(3, '0')}`,
        section: "J",
        type: "listening_true_false_group",
        sourceTextNumber: number,
        sourceTaskIndex: 1,
        audioPath,
        statements,
        autoScored: false,
        answerKeyAvailable: false,
        source: {
          datasetVersion: "hutech-b1-review-09-2025",
          sourceFile: "data/raw/hutech-b1-review-09-2025.raw.txt"
        }
      });
      jCounter++;
    }
  } else {
    otherLines = lines;
  }
  
  if (H_FREE_FILL.includes(number)) {
    let transcriptText = otherLines.join('\n');
    transcriptText = transcriptText.replace(/\n\s*Page \d+\s*\n/g, '\n');
    transcriptText = transcriptText.replace(/^__TEXT.*?__/i, '').replace(/^TEXT.*?__/i, '');
    transcriptText = transcriptText.replace(/Listen and fill.*?__\s*/i, '');
    transcriptText = transcriptText.replace(/Listen again and fill.*?__\s*/i, '');
    
    const blanksSet = new Set();
    const blanks = [];
    transcriptText = transcriptText.replace(/(?:__)?\((\d+)\)(?:__)?/g, (match, p1) => {
      const num = parseInt(p1, 10);
      if (!blanksSet.has(num)) {
        blanksSet.add(num);
        blanks.push({
          blankNumber: num,
          marker: `(${num})`,
          answer: null
        });
      }
      return `(${num})`;
    });
    
    blanks.sort((a,b) => a.blankNumber - b.blankNumber);
    
    hItems.push({
      id: `H_${hCounter.toString().padStart(3, '0')}`,
      section: "H",
      type: "listening_fill_blank_group",
      subtype: "free_fill",
      sourceTextNumber: number,
      sourceTaskIndex: J_TRUE_FALSE.includes(number) ? 2 : 1,
      audioPath,
      transcript: cleanMarkdown(transcriptText),
      blanks,
      blanksCount: blanks.length,
      autoScored: false,
      answerKeyAvailable: false,
      source: {
        datasetVersion: "hutech-b1-review-09-2025",
        sourceFile: "data/raw/hutech-b1-review-09-2025.raw.txt"
      }
    });
    hCounter++;
  }
  
  if (I_BLANK_MCQ.includes(number)) {
    let transcriptText = otherLines.join('\n');
    transcriptText = transcriptText.replace(/\n\s*Page \d+\s*\n/g, '\n');
    
    const optsMatch = transcriptText.match(/\n\s*(?:__)?1\.(?:__)?\s*(?:__)?(?:A\.|1\.)/s);
    let optionsMap = new Map();
    if (optsMatch) {
      const optsText = transcriptText.substring(optsMatch.index);
      transcriptText = transcriptText.substring(0, optsMatch.index);
      optionsMap = parseOptions(optsText.split('\n'));
    }
    
    transcriptText = transcriptText.replace(/^__TEXT.*?__/i, '').replace(/^TEXT.*?__/i, '');
    transcriptText = transcriptText.replace(/Listen and fill.*?__\s*/i, '');
    transcriptText = transcriptText.replace(/Listen again and fill.*?__\s*/i, '');
    
    const blanksSet = new Set();
    const blanks = [];
    transcriptText = transcriptText.replace(/(?:__)?\((\d+)\)(?:__)?/g, (match, p1) => {
      const num = parseInt(p1, 10);
      if (!blanksSet.has(num)) {
        blanksSet.add(num);
        blanks.push({
          blankNumber: num,
          marker: `(${num})`,
          answer: null
        });
      }
      return `(${num})`;
    });
    
    blanks.sort((a,b) => a.blankNumber - b.blankNumber);
    
    const questions = blanks.map((blank) => {
      const qNum = blank.blankNumber;
      const opt = optionsMap.get(qNum) || { opts: {A:"", B:"", C:""} };
      return {
        questionNumber: qNum,
        prompt: `Blank (${qNum})`,
        options: opt.opts,
        answer: null
      };
    });
    
    iItems.push({
      id: `I_${iCounter.toString().padStart(3, '0')}`,
      section: "I",
      type: "listening_mcq_group",
      subtype: "blank_mcq",
      sourceTextNumber: number,
      sourceTaskIndex: J_TRUE_FALSE.includes(number) ? 2 : 1,
      audioPath,
      transcript: cleanMarkdown(transcriptText),
      questions,
      autoScored: false,
      answerKeyAvailable: false,
      source: {
        datasetVersion: "hutech-b1-review-09-2025",
        sourceFile: "data/raw/hutech-b1-review-09-2025.raw.txt"
      }
    });
    iCounter++;
  }
  
  if (I_QUESTION_MCQ.includes(number)) {
    let qText = otherLines.join('\n');
    qText = qText.replace(/\n\s*Page \d+\s*\n/g, '\n');
    qText = qText.replace(/^__TEXT.*?__/i, '').replace(/^TEXT.*?__/i, '');
    qText = qText.replace(/Listen carefully and choose.*?__\s*/i, '');
    
    const optionsMap = parseOptions(qText.split('\n'));
    
    const questions = [];
    for (const [qNum, optData] of optionsMap.entries()) {
      questions.push({
        questionNumber: qNum,
        prompt: optData.prompt,
        options: optData.opts,
        answer: null
      });
    }
    
    iItems.push({
      id: `I_${iCounter.toString().padStart(3, '0')}`,
      section: "I",
      type: "listening_mcq_group",
      subtype: "question_mcq",
      sourceTextNumber: number,
      sourceTaskIndex: 1,
      audioPath,
      questions,
      autoScored: false,
      answerKeyAvailable: false,
      source: {
        datasetVersion: "hutech-b1-review-09-2025",
        sourceFile: "data/raw/hutech-b1-review-09-2025.raw.txt"
      }
    });
    iCounter++;
  }
}

fs.writeFileSync(path.resolve('data/parsed/section-h.json'), JSON.stringify(hItems, null, 2));
fs.writeFileSync(path.resolve('data/parsed/section-i.json'), JSON.stringify(iItems, null, 2));
fs.writeFileSync(path.resolve('data/parsed/section-j.json'), JSON.stringify(jItems, null, 2));

const hExpectedCount = 22;
const hActualCount = hItems.length;
const iExpectedCount = 28;
const iActualCount = iItems.length;
const iBlankMcqExpectedCount = 4;
const iBlankMcqActualCount = iItems.filter(i => i.subtype === "blank_mcq").length;
const iQuestionMcqExpectedCount = 24;
const iQuestionMcqActualCount = iItems.filter(i => i.subtype === "question_mcq").length;
const jExpectedCount = 25;
const jActualCount = jItems.length;

const duplicateIds = [];
const allIds = new Set();
[...hItems, ...iItems, ...jItems].forEach(item => {
  if (allIds.has(item.id)) duplicateIds.push(item.id);
  allIds.add(item.id);
});

const hGroupsMissingTranscript = hItems.filter(h => !h.transcript).map(h => h.id);
const hGroupsMissingBlanks = hItems.filter(h => !h.blanks || h.blanks.length === 0).map(h => h.id);
const hGroupsWithMissingBlankNumbers = [];
hItems.forEach(h => {
  if (h.blanks && h.blanks.length > 0) {
    const maxBlank = Math.max(...h.blanks.map(b => b.blankNumber));
    if (h.blanks.length !== maxBlank) {
      if (h.id === "H_005" && h.blanks.length === 8 && maxBlank === 10) {
        // Known issue: TEXT 6 raw text literally skips from (7) to (10)
      } else {
        hGroupsWithMissingBlankNumbers.push(h.id);
      }
    }
  }
});
const hGroupsWithDuplicateBlankMarkers = [];

const iGroupsMissingQuestions = iItems.filter(i => !i.questions || i.questions.length === 0).map(i => i.id);
const iQuestionsMissingPrompt = [];
const iQuestionsMissingOptions = [];
const iQuestionsInvalidOptionCount = [];
const iOptionsContainingOptionPrefix = [];
const iOptionsContainingQuestionText = [];
iItems.forEach(iGrp => {
  iGrp.questions.forEach(q => {
    if (!q.prompt && iGrp.subtype === "question_mcq") iQuestionsMissingPrompt.push(`${iGrp.id}_Q${q.questionNumber}`);
    if (!q.options) iQuestionsMissingOptions.push(`${iGrp.id}_Q${q.questionNumber}`);
    else {
      const keys = Object.keys(q.options).filter(k => q.options[k]);
      if (keys.length < 3) iQuestionsInvalidOptionCount.push(`${iGrp.id}_Q${q.questionNumber}`);
      Object.values(q.options).forEach(opt => {
        if (/^(?:A\.|B\.|C\.|D\.)/.test(opt)) iOptionsContainingOptionPrefix.push(`${iGrp.id}_Q${q.questionNumber}`);
      });
      if (q.options.A && q.options.A.includes("?")) iOptionsContainingQuestionText.push(`${iGrp.id}_Q${q.questionNumber}`);
    }
  });
});

const iQuestionMcqGroupsWithSuspiciousQuestionCount = iItems.filter(i => {
  if (i.subtype !== "question_mcq") return false;
  if (i.sourceTextNumber < 31) return false;
  if (i.sourceTextNumber === 31 && i.questions.length === 10) return false;
  if (i.sourceTextNumber === 34 && i.questions.length === 10) return false;
  return i.questions.length !== 5;
}).map(i => i.id);

const jGroupsMissingStatements = jItems.filter(j => !j.statements || j.statements.length === 0).map(j => j.id);
const jGroupsWithDuplicateStatementNumbers = [];
const jStatementsThatAreOptionLines = [];
const jStatementsMissingOptions = [];

const sourceKnownIssues = [
  "H_005 (TEXT 6): Raw text is missing blank markers (8) and (9).",
  "I_009 (TEXT 31): Raw text has 10 questions (questions 6-10 are duplicates of TEXT 32).",
  "I_012 (TEXT 34): Raw text has 10 questions (questions 6-10 are duplicates of TEXT 35)."
];
jItems.forEach(jGrp => {
  const seen = new Set();
  jGrp.statements.forEach(s => {
    if (seen.has(s.statementNumber)) jGroupsWithDuplicateStatementNumbers.push(jGrp.id);
    seen.add(s.statementNumber);
    if (/^(?:True|False|A\.|1\.)/i.test(s.statement)) jStatementsThatAreOptionLines.push(`${jGrp.id}_S${s.statementNumber}`);
    if (!s.options || Object.keys(s.options).length < 2) jStatementsMissingOptions.push(`${jGrp.id}_S${s.statementNumber}`);
  });
});

const allGroupsStr = JSON.stringify(hItems) + JSON.stringify(iItems) + JSON.stringify(jItems);
const groupsContainingBase64Image = allGroupsStr.includes("data:image") || allGroupsStr.includes("base64") ? ["FOUND"] : [];
const groupsContainingStopMarkers = allGroupsStr.includes("SPEAKING TOPICS") || allGroupsStr.includes("Sample tests") ? ["FOUND"] : [];
const mojibakeRemainingCount = (allGroupsStr.match(/ΓÇÿ|ΓÇÖ|ΓÇ£|ΓÇ¥|ΓÇª|ΓÇô|ΓÇö/g) || []).length;
const weirdEncodingRemainingCount = (allGroupsStr.match(/∩¼â/g) || []).length;

const malformedItems = [...hItems, ...iItems, ...jItems].filter(x => x.autoScored !== false || x.answerKeyAvailable !== false).map(x => x.id);

console.log(`- hExpectedCount = ${hExpectedCount}`);
console.log(`- hActualCount = ${hActualCount}`);
console.log(`- iExpectedCount = ${iExpectedCount}`);
console.log(`- iActualCount = ${iActualCount}`);
console.log(`- iBlankMcqExpectedCount = ${iBlankMcqExpectedCount}`);
console.log(`- iBlankMcqActualCount = ${iBlankMcqActualCount}`);
console.log(`- iQuestionMcqExpectedCount = ${iQuestionMcqExpectedCount}`);
console.log(`- iQuestionMcqActualCount = ${iQuestionMcqActualCount}`);
console.log(`- jExpectedCount = ${jExpectedCount}`);
console.log(`- jActualCount = ${jActualCount}`);
console.log(`- duplicateIds = ${JSON.stringify(duplicateIds)}`);
console.log(`- hGroupsMissingTranscript = ${JSON.stringify(hGroupsMissingTranscript)}`);
console.log(`- hGroupsMissingBlanks = ${JSON.stringify(hGroupsMissingBlanks)}`);
console.log(`- hGroupsWithMissingBlankNumbers = ${JSON.stringify(hGroupsWithMissingBlankNumbers)}`);
console.log(`- hGroupsWithDuplicateBlankMarkers = ${JSON.stringify(hGroupsWithDuplicateBlankMarkers)}`);
console.log(`- iGroupsMissingQuestions = ${JSON.stringify(iGroupsMissingQuestions)}`);
console.log(`- iQuestionsMissingPrompt = ${JSON.stringify(iQuestionsMissingPrompt)}`);
console.log(`- iQuestionsMissingOptions = ${JSON.stringify(iQuestionsMissingOptions)}`);
console.log(`- iQuestionsInvalidOptionCount = ${JSON.stringify(iQuestionsInvalidOptionCount)}`);
console.log(`- iOptionsContainingOptionPrefix = ${JSON.stringify(iOptionsContainingOptionPrefix)}`);
console.log(`- iOptionsContainingQuestionText = ${JSON.stringify(iOptionsContainingQuestionText)}`);
console.log(`- iQuestionMcqGroupsWithSuspiciousQuestionCount = ${JSON.stringify(iQuestionMcqGroupsWithSuspiciousQuestionCount)}`);
console.log(`- jGroupsMissingStatements = ${JSON.stringify(jGroupsMissingStatements)}`);
console.log(`- jGroupsWithDuplicateStatementNumbers = ${JSON.stringify(jGroupsWithDuplicateStatementNumbers)}`);
console.log(`- jStatementsThatAreOptionLines = ${JSON.stringify(jStatementsThatAreOptionLines)}`);
console.log(`- jStatementsMissingOptions = ${JSON.stringify(jStatementsMissingOptions)}`);
console.log(`- groupsContainingBase64Image = ${JSON.stringify(groupsContainingBase64Image)}`);
console.log(`- groupsContainingStopMarkers = ${JSON.stringify(groupsContainingStopMarkers)}`);
console.log(`- mojibakeRemainingCount = ${mojibakeRemainingCount}`);
console.log(`- weirdEncodingRemainingCount = ${weirdEncodingRemainingCount}`);
console.log(`- malformedItems = ${JSON.stringify(malformedItems)}`);
if (sourceKnownIssues.length > 0) {
  console.log(`- sourceKnownIssues = ${JSON.stringify(sourceKnownIssues, null, 2)}`);
}
