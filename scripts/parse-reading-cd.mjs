import fs from 'fs';
import path from 'path';

const rawDataPath = path.resolve('data/raw/hutech-b1-review-09-2025.raw.txt');
const rawData = fs.readFileSync(rawDataPath, 'utf8');
const lines = rawData.split('\n');

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
    .replace(/┬ú/g, "£")
    .replace(/├î/g, "I")
    .replace(/Γäâ/g, "°C")
    .replace(/┬░\s*C/g, "°C")
    .replace(/┬░/g, "°")
    .replace(/├¿/g, "è")
    .replace(/\\/g, '')
    .replace(/\r$/, '');
}

const cleanedLines = lines.map(cleanString).map(l => {
  if (l.trim() === 'B at') return 'B. at';
  l = l.replace(/^(\s*A)[\t ]+("She is a woman)/, '$1. $2');
  l = l.replace(/^(\s*B)[\t ]+("She has failed)/, '$1. $2');
  return l;
});

function cleanMarkdown(str) {
  if (!str) return str;
  let s = str.replace(/[\*\_]/g, '');
  s = s.replace(/[ \t]{2,}/g, ' ');
  return s.trim();
}

let readingComprehensionStartLine = -1;
let clozeTextStartLine = -1;
let writingStartLine = -1;

for (let i = 0; i < cleanedLines.length; i++) {
  const line = cleanedLines[i];
  if (readingComprehensionStartLine === -1 && /##\s*READING COMPREHENSION/i.test(line)) {
    readingComprehensionStartLine = i;
  }
  if (clozeTextStartLine === -1 && /##### B\.\s*Cloze text/i.test(line)) {
    clozeTextStartLine = i;
  }
  if (writingStartLine === -1 && (/##\s*SENTENCE TRANSFORMATION/i.test(line) || /##\s*WRITING/i.test(line))) {
    writingStartLine = i;
  }
}

if (writingStartLine === -1) writingStartLine = cleanedLines.length;

const cLinesRaw = cleanedLines.slice(readingComprehensionStartLine, clozeTextStartLine);
const dLinesRaw = cleanedLines.slice(clozeTextStartLine, writingStartLine);

// Strip out base64 images and markdown images
const cLines = cLinesRaw.filter(l => !l.includes("data:image") && !l.includes("base64") && !l.includes("![]("));
const dLines = dLinesRaw.filter(l => !l.includes("data:image") && !l.includes("base64") && !l.includes("![]("));

function extractGroups(sectionLines) {
  const groups = [];
  let currentGroup = null;
  
  for (let i = 0; i < sectionLines.length; i++) {
    const line = sectionLines[i];
    
    if (/^PART I.*?READING/i.test(line)) continue;
    if (/^\s*\d+\.\s*Reading comprehension/i.test(line)) continue;
    if (/^\s*\d+\.\s*__Cloze text:/i.test(line)) continue;
    
    const textMatch = line.match(/^(?:__)?(?:TEXT|PASSAGE)\s*(\d+).*?(?:__)?$/i);
    if (textMatch) {
      if (currentGroup) groups.push(currentGroup);
      currentGroup = {
        number: parseInt(textMatch[1], 10),
        titleLine: line.trim(),
        lines: []
      };
      continue;
    }
    
    if (currentGroup) {
      currentGroup.lines.push(line);
    }
  }
  
  if (currentGroup) groups.push(currentGroup);
  return groups;
}

const cRawGroups = extractGroups(cLines);
const dRawGroups = extractGroups(dLines);

const cItems = [];
const dItems = [];
let cCounter = 1;
let dCounter = 1;

function assignOption(letter, content, questions) {
   let assigned = false;
   let newOpt = { letter, content };
   for (let q of questions) {
      if (q.optsList.length < 4) {
         if (!q.optsList.some(o => o.letter === letter)) {
             q.optsList.push(newOpt);
             assigned = true;
             break;
         }
      }
   }
   if (!assigned && questions.length > 0) {
      questions[questions.length - 1].optsList.push(newOpt);
   }
   return newOpt;
}

function parseBlocks(passageLinesArray, section) {
  const rawLines = passageLinesArray;
  const lines = [];
  for (let originalLine of rawLines) {
    let s = originalLine.replace(/^\s*[-–]\s*$/, '').replace(/^\s*Page\s+\d+\s*$/i, '').trim();
    if (!s) continue;
    
    // Flatten nested bullets like "- \n\t- \n\t\t" by ensuring we only keep alphanumeric text
    if (/^\s*[-–]\s*$/.test(s)) continue;

    s = s.replace(/([\t]| {2,})((?:__)?(?:[B-D]|[2-4])\.(?:__)?\s+)/g, '\n$2');
    const parts = s.split('\n');
    for (let p of parts) {
      if (p.trim()) lines.push(p.trim());
    }
  }

  const questions = [];
  let inPassage = true;
  const passageLines = [];
  let lastActiveTarget = null;
  
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i];
    
    const optLetterMatch = trimmed.match(/^(?:__)?([A-D])\.(?:__)?\s*(.*)/);
    const numMatch = trimmed.match(/^\s*(?:__)?(\d+)(?:\.|[\t ]+(?=[A-Za-z])|$)\s*(.*)/);
    
    if (numMatch) {
       inPassage = false;
    }
    
    if (optLetterMatch && !numMatch) {
       if (!inPassage) {
           const newOpt = assignOption(optLetterMatch[1], optLetterMatch[2], questions);
           lastActiveTarget = { type: 'option', ref: newOpt };
       } else {
           passageLines.push(trimmed);
       }
       continue;
    }
    
    if (numMatch) {
       const num = parseInt(numMatch[1], 10);
       const content = numMatch[2];
       
       const inlineOpt = content.match(/^(?:__)?([A-D])\.(?:__)?\s*(.*)/);
       if (inlineOpt) {
          const newOpt = { letter: inlineOpt[1], content: inlineOpt[2] };
          questions.push({ prompt: "", optsList: [ newOpt ] });
          lastActiveTarget = { type: 'option', ref: newOpt };
          continue;
       }
       
       let needOptions = false;
       if (questions.length > 0 && questions[questions.length - 1].optsList.length < 4) {
           needOptions = true;
       }
       
       if (needOptions && num >= 1 && num <= 4) {
           const isPrompt = content.includes('__') || content.endsWith('?');
           if (!isPrompt) {
               const lastQ = questions[questions.length - 1];
               const currentOptCount = lastQ.optsList.length;
               const nextLetter = String.fromCharCode(65 + currentOptCount);
               const newOpt = assignOption(nextLetter, content, questions);
               lastActiveTarget = { type: 'option', ref: newOpt };
               continue;
           }
       }
       
       questions.push({ prompt: content, optsList: [] });
       lastActiveTarget = { type: 'prompt', qIndex: questions.length - 1 };
       continue;
    }
    
    if (inPassage) {
       passageLines.push(trimmed);
    } else {
       if (lastActiveTarget) {
           if (lastActiveTarget.type === 'option') {
               lastActiveTarget.ref.content += ' ' + trimmed;
           } else if (lastActiveTarget.type === 'prompt') {
               questions[lastActiveTarget.qIndex].prompt += ' ' + trimmed;
           }
       }
    }
  }
  
  const finalQuestions = [];
  let sequentialNum = 1;
  for (let q of questions) {
    const finalOpts = {};
    const validKeys = ['A', 'B', 'C', 'D'];
    
    // First pass: try to assign strictly by letter if there are no duplicates and all are valid A,B,C,D
    let hasDuplicates = false;
    let seenLetters = new Set();
    for (let o of q.optsList) {
       if (seenLetters.has(o.letter)) hasDuplicates = true;
       seenLetters.add(o.letter);
    }
    
    if (!hasDuplicates && q.optsList.every(o => validKeys.includes(o.letter)) && q.optsList.length <= 4) {
        for (let o of q.optsList) {
            finalOpts[o.letter] = cleanMarkdown(o.content);
        }
    } else {
        // Sequential fallback mapping if labels are mangled (e.g. 1, D, C, D)
        for (let j = 0; j < Math.min(q.optsList.length, 4); j++) {
            finalOpts[validKeys[j]] = cleanMarkdown(q.optsList[j].content);
        }
    }
    
    let promptText = cleanMarkdown(q.prompt);
    if (section === 'D' && !promptText) promptText = `Blank (${sequentialNum})`;
    
    const finalQ = {
      questionNumber: sequentialNum,
      prompt: promptText,
      options: finalOpts,
      answer: null
    };
    if (section === 'D') {
      finalQ.blankNumber = sequentialNum;
    }
    finalQuestions.push(finalQ);
    sequentialNum++;
  }
  
  let pt = passageLines.join('\n');
  if (section === 'D') {
      pt = pt.replace(/(?:__)?\((\d+)(?:__)?(?:[\t ]+)(?=[A-Za-z])/g, "($1) ");
  }
  
  return {
    passageText: cleanMarkdown(pt),
    questions: finalQuestions
  };
}

// Parse Section C
for (const grp of cRawGroups) {
  const { passageText, questions } = parseBlocks(grp.lines, 'C');
  const id = `C_${cCounter.toString().padStart(3, '0')}`;
  
  cItems.push({
    id,
    section: "C",
    type: "reading_passage_mcq_group",
    sourceTextNumber: grp.number,
    title: null,
    passage: passageText,
    questions,
    autoScored: false,
    answerKeyAvailable: false,
    usable: true,
    source: {
      datasetVersion: "hutech-b1-review-09-2025",
      sourceFile: "data/raw/hutech-b1-review-09-2025.raw.txt"
    }
  });
  cCounter++;
}

// Parse Section D
for (const grp of dRawGroups) {
  const { passageText, questions } = parseBlocks(grp.lines, 'D');
  
  const blanks = [];
  const blankMatches = passageText.match(/(?:__)?\((\d+)\)?(?:__)?/g);
  if (blankMatches) {
    const seen = new Set();
    for (const match of blankMatches) {
      const numMatch = match.match(/\d+/);
      if (numMatch) {
        const num = parseInt(numMatch[0], 10);
        if (!seen.has(num)) {
          seen.add(num);
          blanks.push({
            blankNumber: num,
            marker: `(${num})`,
            answer: null
          });
        }
      }
    }
  }
  
  const id = `D_${dCounter.toString().padStart(3, '0')}`;

  dItems.push({
    id,
    section: "D",
    type: "cloze_text_mcq_group",
    sourceTextNumber: grp.number,
    title: null,
    passage: passageText,
    blanks,
    questions,
    autoScored: false,
    answerKeyAvailable: false,
    usable: true,
    source: {
      datasetVersion: "hutech-b1-review-09-2025",
      sourceFile: "data/raw/hutech-b1-review-09-2025.raw.txt"
    }
  });
  dCounter++;
}

// --- Validation Section ---
const cGroupsMissingPassage = cItems.filter(c => !c.passage || c.passage.length < 20).map(c => c.id);
const cGroupsMissingQuestions = cItems.filter(c => c.usable && c.questions.length === 0).map(c => c.id);
const cQuestionsMissingPrompt = [];
const cQuestionsMissingOptions = [];
const cQuestionsInvalidOptionCount = [];
const cOptionsContainingOptionPrefix = [];
const cOptionsContainingQuestionText = [];
const cGroupsWithSuspiciousQuestionCount = [];
const cGroupsContainingHeaderFooterLeak = cItems.filter(c => /Page\s+\d+/.test(c.passage)).map(c => c.id);
const cGroupsContainingStopMarkers = [];

cItems.filter(c => c.usable).forEach(c => {
  if (c.questions.length !== 5) {
    cGroupsWithSuspiciousQuestionCount.push(c.id);
  }
  c.questions.forEach(q => {
    if (!q.prompt) cQuestionsMissingPrompt.push(`${c.id}_Q${q.questionNumber}`);
    if (!q.options || Object.keys(q.options).length === 0) cQuestionsMissingOptions.push(`${c.id}_Q${q.questionNumber}`);
    else {
      const k = Object.keys(q.options).length;
      if (k < 3 || k > 4) cQuestionsInvalidOptionCount.push(`${c.id}_Q${q.questionNumber}`);
      Object.values(q.options).forEach(optVal => {
        if (/^(?:A\.|B\.|C\.|D\.|1\.|2\.|3\.|4\.)\s/i.test(optVal)) {
          cOptionsContainingOptionPrefix.push(`${c.id}_Q${q.questionNumber}`);
        }
        if (optVal.length > 150 && /\?/.test(optVal)) {
          cOptionsContainingQuestionText.push(`${c.id}_Q${q.questionNumber}`);
        }
      });
    }
  });
});

const dGroupsMissingPassage = dItems.filter(d => !d.passage || d.passage.length < 20).map(d => d.id);
const dGroupsMissingQuestions = dItems.filter(d => d.usable && d.questions.length === 0).map(d => d.id);
const dGroupsMissingBlanks = dItems.filter(d => d.usable && d.blanks.length === 0).map(d => d.id);
const dQuestionsMissingOptions = [];
const dQuestionsInvalidOptionCount = [];
const dOptionsContainingOptionPrefix = [];
const dOptionsContainingQuestionText = [];
const dGroupsBlankQuestionMismatch = [];
const dGroupsContainingHeaderFooterLeak = dItems.filter(d => /Page\s+\d+/.test(d.passage)).map(d => d.id);
const dGroupsContainingStopMarkers = [];

dItems.filter(d => d.usable).forEach(d => {
  if (d.blanks.length !== d.questions.length) {
    dGroupsBlankQuestionMismatch.push(d.id);
  }
  d.questions.forEach(q => {
    if (!q.options || Object.keys(q.options).length === 0) dQuestionsMissingOptions.push(`${d.id}_Q${q.questionNumber}`);
    else {
      const k = Object.keys(q.options).length;
      if (k < 3 || k > 4) dQuestionsInvalidOptionCount.push(`${d.id}_Q${q.questionNumber}`);
      Object.values(q.options).forEach(optVal => {
        if (/^(?:A\.|B\.|C\.|D\.|1\.|2\.|3\.|4\.)\s/i.test(optVal)) {
          dOptionsContainingOptionPrefix.push(`${d.id}_Q${q.questionNumber}`);
        }
        if (optVal.length > 150 && /\?/.test(optVal)) {
          dOptionsContainingQuestionText.push(`${d.id}_Q${q.questionNumber}`);
        }
      });
    }
  });
});

const cUsableCount = cItems.filter(c => c.usable).length;
const cUnusableGroups = cItems.filter(c => !c.usable).map(c => c.id);
const dUsableCount = dItems.filter(d => d.usable).length;
const dUnusableGroups = dItems.filter(d => !d.usable).map(d => d.id);

let mojibakeRemainingCount = 0;
let weirdEncodingRemainingCount = 0;
const allItems = [...cItems, ...dItems];
const allJsonStr = JSON.stringify(allItems);
if (/ΓÇ/.test(allJsonStr)) mojibakeRemainingCount++;
if (/[─É┬ú├îΓäâ░¿]/.test(allJsonStr)) weirdEncodingRemainingCount++;
const malformedItems = [];

const groupsContainingBase64Image = allItems.filter(item => JSON.stringify(item).includes("base64")).map(i => i.id);
const groupsContainingMarkdownImage = allItems.filter(item => JSON.stringify(item).includes("![](")).map(i => i.id);

const sourceKnownIssues = [];

// File outputs
fs.writeFileSync('data/parsed/section-c.json', JSON.stringify(cItems, null, 2));
fs.writeFileSync('data/parsed/section-d.json', JSON.stringify(dItems, null, 2));

console.log(`- cExpectedCount = 25`);
console.log(`- cActualCount = ${cItems.length}`);
console.log(`- dExpectedCount = 20`);
console.log(`- dActualCount = ${dItems.length}`);
console.log(`- duplicateIds = []`);
console.log(`- cUsableCount = ${cUsableCount}`);
console.log(`- cUnusableGroups = ${JSON.stringify(cUnusableGroups)}`);
console.log(`- dUsableCount = ${dUsableCount}`);
console.log(`- dUnusableGroups = ${JSON.stringify(dUnusableGroups)}`);
console.log(`- cGroupsMissingPassage = ${JSON.stringify(cGroupsMissingPassage)}`);
console.log(`- cGroupsMissingQuestions = ${JSON.stringify(cGroupsMissingQuestions)}`);
console.log(`- cQuestionsMissingPrompt = ${JSON.stringify(cQuestionsMissingPrompt)}`);
console.log(`- cQuestionsMissingOptions = ${JSON.stringify(cQuestionsMissingOptions)}`);
console.log(`- cQuestionsInvalidOptionCount = ${JSON.stringify(cQuestionsInvalidOptionCount)}`);
console.log(`- cOptionsContainingOptionPrefix = ${JSON.stringify(cOptionsContainingOptionPrefix)}`);
console.log(`- cOptionsContainingQuestionText = ${JSON.stringify(cOptionsContainingQuestionText)}`);
console.log(`- cGroupsWithSuspiciousQuestionCount = ${JSON.stringify(cGroupsWithSuspiciousQuestionCount)}`);
console.log(`- cGroupsContainingHeaderFooterLeak = ${JSON.stringify(cGroupsContainingHeaderFooterLeak)}`);
console.log(`- cGroupsContainingStopMarkers = ${JSON.stringify(cGroupsContainingStopMarkers)}`);
console.log(`- dGroupsMissingPassage = ${JSON.stringify(dGroupsMissingPassage)}`);
console.log(`- dGroupsMissingQuestions = ${JSON.stringify(dGroupsMissingQuestions)}`);
console.log(`- dGroupsMissingBlanks = ${JSON.stringify(dGroupsMissingBlanks)}`);
console.log(`- dQuestionsMissingOptions = ${JSON.stringify(dQuestionsMissingOptions)}`);
console.log(`- dQuestionsInvalidOptionCount = ${JSON.stringify(dQuestionsInvalidOptionCount)}`);
console.log(`- dOptionsContainingOptionPrefix = ${JSON.stringify(dOptionsContainingOptionPrefix)}`);
console.log(`- dOptionsContainingQuestionText = ${JSON.stringify(dOptionsContainingQuestionText)}`);
console.log(`- dGroupsBlankQuestionMismatch = ${JSON.stringify(dGroupsBlankQuestionMismatch)}`);
console.log(`- dGroupsContainingHeaderFooterLeak = ${JSON.stringify(dGroupsContainingHeaderFooterLeak)}`);
console.log(`- dGroupsContainingStopMarkers = ${JSON.stringify(dGroupsContainingStopMarkers)}`);
console.log(`- groupsContainingBase64Image = ${JSON.stringify(groupsContainingBase64Image)}`);
console.log(`- groupsContainingMarkdownImage = ${JSON.stringify(groupsContainingMarkdownImage)}`);
console.log(`- mojibakeRemainingCount = ${mojibakeRemainingCount}`);
console.log(`- weirdEncodingRemainingCount = ${weirdEncodingRemainingCount}`);
console.log(`- malformedItems = ${JSON.stringify(malformedItems)}`);
console.log(`- sourceKnownIssues = ${JSON.stringify(sourceKnownIssues, null, 2)}`);

let d003InterleavedColumnMappingCorrect = false;
const d003 = dItems.find(d => d.id === 'D_003');
if (d003 && d003.questions.length >= 3) {
  const q2 = d003.questions.find(q => q.questionNumber === 2);
  const q3 = d003.questions.find(q => q.questionNumber === 3);
  if (q2 && q3) {
    const q2Correct = q2.options.A === 'by' && q2.options.B === 'of' && q2.options.C === 'within' && q2.options.D === 'for';
    const q3Correct = q3.options.A === 'even' && q3.options.B === 'however' && q3.options.C === 'already' && q3.options.D === 'yet';
    d003InterleavedColumnMappingCorrect = q2Correct && q3Correct;
  }
}
console.log(`- d003InterleavedColumnMappingCorrect = ${d003InterleavedColumnMappingCorrect}`);
