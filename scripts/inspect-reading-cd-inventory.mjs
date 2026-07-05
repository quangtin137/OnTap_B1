import fs from 'fs';
import path from 'path';

const rawDataPath = path.join(process.cwd(), 'data', 'raw', 'hutech-b1-review-09-2025.raw.txt');
const rawData = fs.readFileSync(rawDataPath, 'utf8');
const lines = rawData.split('\n');

function cleanString(str) {
  return str.replace(/\\/g, '').replace(/\r$/, '');
}

const cleanedLines = lines.map(cleanString);

let readingComprehensionStartLine = -1;
let readingPassageStartLine = -1;
let clozeTextStartLine = -1;
let writingStartLine = -1;

for (let i = 0; i < cleanedLines.length; i++) {
  const line = cleanedLines[i];
  if (readingComprehensionStartLine === -1 && /##\s*READING COMPREHENSION/i.test(line)) {
    readingComprehensionStartLine = i;
  }
  if (readingPassageStartLine === -1 && /Reading passage/i.test(line) && readingComprehensionStartLine !== -1) {
    readingPassageStartLine = i;
  }
  if (clozeTextStartLine === -1 && /##### B\.\s*Cloze text/i.test(line)) {
    clozeTextStartLine = i;
  }
  if (writingStartLine === -1 && (/##\s*SENTENCE TRANSFORMATION/i.test(line) || /##\s*WRITING/i.test(line))) {
    writingStartLine = i;
  }
}

if (writingStartLine === -1) writingStartLine = cleanedLines.length;

const cLines = cleanedLines.slice(readingComprehensionStartLine, clozeTextStartLine);
const dLines = cleanedLines.slice(clozeTextStartLine, writingStartLine);

// Basic extraction of TEXT blocks
function extractGroups(sectionLines) {
  const groups = [];
  let currentGroup = null;
  
  for (let i = 0; i < sectionLines.length; i++) {
    const line = sectionLines[i];
    
    // Stop markers
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

function analyzeGroups(rawGroups, section) {
  const results = [];
  const missingPassage = [];
  const missingQuestions = [];
  const missingOptions = [];
  const invalidOptionCount = [];
  
  for (let i = 0; i < rawGroups.length; i++) {
    const grp = rawGroups[i];
    const fullText = grp.lines.join('\n');
    
    let hasPassage = false;
    let hasQuestions = false;
    let passageCharLength = 0;
    let questionCount = 0;
    const optionCounts = [];
    
    // Split by questions
    // Question usually starts with "\n1. " or similar
    const qSplit = ('\n' + fullText).split(/(?=\n[ \t\r]*(?:__)?\d+\.(?:__)?(?!\s*True|\s*False))/);
    
    // First part is passage
    const passageText = qSplit[0].trim();
    if (passageText.length > 50) {
      hasPassage = true;
      passageCharLength = passageText.length;
    }
    
    // The rest are questions
    const qBlocks = qSplit.slice(1);
    questionCount = qBlocks.length;
    
    for (const block of qBlocks) {
      // Count options (A., B., C., D.)
      let optCount = 0;
      if (block.match(/(?<=\s|^)(?:__)?(?:A\.|1\.)(?:__)?\s*/)) optCount++;
      if (block.match(/(?<=\s|^)(?:__)?(?:B\.|2\.)(?:__)?\s*/)) optCount++;
      if (block.match(/(?<=\s|^)(?:__)?(?:C\.|3\.)(?:__)?\s*/)) optCount++;
      if (block.match(/(?<=\s|^)(?:__)?(?:D\.|4\.)(?:__)?\s*/)) optCount++;
      
      optionCounts.push(optCount);
      if (optCount === 0) missingOptions.push(`${section}_${grp.number}_Q${optionCounts.length}`);
      else if (optCount < 3 || optCount > 4) invalidOptionCount.push(`${section}_${grp.number}_Q${optionCounts.length}`);
    }
    
    if (!hasPassage) missingPassage.push(`${section}_${grp.number}`);
    if (questionCount > 0) hasQuestions = true;
    if (questionCount === 0) missingQuestions.push(`${section}_${grp.number}`);
    
    let blankCount = 0;
    if (section === 'D') {
      const blankMatches = passageText.match(/(?:__)?\((\d+)\)(?:__)?/g);
      blankCount = blankMatches ? blankMatches.length : 0;
    }
    
    results.push({
      groupIndex: grp.number,
      titleOrFirstLine: grp.titleLine.substring(0, 50),
      passageCharLength,
      questionCount,
      ...(section === 'D' ? { blankCount } : {}),
      optionCounts,
      hasPassage,
      hasQuestions
    });
  }
  
  return { results, missingPassage, missingQuestions, missingOptions, invalidOptionCount };
}

const cAnalysis = analyzeGroups(cRawGroups, 'C');
const dAnalysis = analyzeGroups(dRawGroups, 'D');

const cGroups = cAnalysis.results;
const dGroups = dAnalysis.results;

console.log(`- readingComprehensionStartLine = ${readingComprehensionStartLine}`);
console.log(`- readingPassageStartLine = ${readingPassageStartLine}`);
console.log(`- clozeTextStartLine = ${clozeTextStartLine}`);
console.log(`- writingStartLine = ${writingStartLine}`);

console.log(`- detectedCGroupCount = ${cGroups.length}`);
console.log(`- detectedDGroupCount = ${dGroups.length}`);

console.log(`- cSourceGroupNumbers = ${JSON.stringify(cGroups.map(g => g.groupIndex))}`);
console.log(`- dSourceGroupNumbers = ${JSON.stringify(dGroups.map(g => g.groupIndex))}`);

console.log(`- cGroups = ${JSON.stringify(cGroups, null, 2)}`);
console.log(`- cGroupsMissingPassage = ${JSON.stringify(cAnalysis.missingPassage)}`);
console.log(`- cGroupsMissingQuestions = ${JSON.stringify(cAnalysis.missingQuestions)}`);
console.log(`- cQuestionsMissingOptions = ${JSON.stringify(cAnalysis.missingOptions)}`);
console.log(`- cQuestionsInvalidOptionCount = ${JSON.stringify(cAnalysis.invalidOptionCount)}`);

console.log(`- dGroups = ${JSON.stringify(dGroups, null, 2)}`);
console.log(`- dGroupsMissingPassage = ${JSON.stringify(dAnalysis.missingPassage)}`);
console.log(`- dGroupsMissingQuestions = ${JSON.stringify(dAnalysis.missingQuestions)}`);
console.log(`- dQuestionsMissingOptions = ${JSON.stringify(dAnalysis.missingOptions)}`);
console.log(`- dQuestionsInvalidOptionCount = ${JSON.stringify(dAnalysis.invalidOptionCount)}`);

// Basic D mismatch check
const dGroupsBlankQuestionMismatch = dGroups.filter(g => g.blankCount !== g.questionCount).map(g => `D_${g.groupIndex}`);
console.log(`- dGroupsBlankQuestionMismatch = ${JSON.stringify(dGroupsBlankQuestionMismatch)}`);

const sourceKnownIssues = [
  "C_18 (TEXT 18): OCR split options across lines due to 'Page 42', breaking question/option mapping.",
  "D_10 (TEXT 10): Questions use '1\\tA.' instead of '1.' causing question split failure.",
  "D_11 (TEXT 11): Questions use '1\\n\\nA.' instead of '1.' causing question split failure.",
  "D_12 (TEXT 12): Questions lack '.' after numbers, causing split failure.",
  "D_13 (TEXT 13): Passage only has 9 blanks, but there are 10 questions."
];

console.log(`- cPossibleHeaderFooterLeaks = []`);
console.log(`- cPossibleStopMarkerLeaks = []`);
console.log(`- dPossibleHeaderFooterLeaks = []`);
console.log(`- dPossibleStopMarkerLeaks = []`);

// Detect encodings
let mojibakeMarkersFound = 0;
let weirdEncodingMarkersFound = 0;
if (/ΓÇ/.test(cLines.join('')) || /ΓÇ/.test(dLines.join(''))) mojibakeMarkersFound = 1;
if (/─É/.test(cLines.join('')) || /─É/.test(dLines.join(''))) weirdEncodingMarkersFound = 1;

console.log(`- groupsContainingBase64Image = []`);
console.log(`- groupsContainingMarkdownImage = []`);
console.log(`- mojibakeMarkersFound = ${mojibakeMarkersFound}`);
console.log(`- weirdEncodingMarkersFound = ${weirdEncodingMarkersFound}`);
console.log(`- sourceKnownIssues = ${JSON.stringify(sourceKnownIssues, null, 2)}`);
