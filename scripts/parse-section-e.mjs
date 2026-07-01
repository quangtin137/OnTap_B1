import fs from "fs";
import path from "path";

const rawPath = path.resolve("data/raw/hutech-b1-review-09-2025.raw.txt");
const outPath = path.resolve("data/parsed/section-e.json");

const rawText = fs.readFileSync(rawPath, "utf8");
const lines = rawText.split(/\r?\n/);

let started = false;
let ended = false;
let qs = [];
let currentItem = null;

let internalCounter = 1;
let currentSet = 1;
let lastRawNumber = 0;

let sectionStartLine = -1;
let sectionEndLine = -1;

function cleanString(str) {
  let s = str
    .replace(/ΓÇÿ/g, "'")
    .replace(/ΓÇÖ/g, "'")
    .replace(/ΓÇ£/g, '"')
    .replace(/ΓÇ¥/g, '"')
    .replace(/ΓÇª/g, '...')
    .replace(/ΓÇô/g, '-')
    .replace(/ΓÇö/g, '-')
    .replace(/\\/g, ''); // remove backslashes
  return s; // removed trim() here to preserve any intentional spacing, we trim later
}

function cleanMarkdownAndPlaceholders(str) {
  let s = str;
  // Remove *, _
  s = s.replace(/[\*\_]/g, '');
  // Remove leading hyphens/bullets/spaces
  s = s.replace(/^[\-\s]+/, '');
  
  // Replace multiple dots or tabs with blank placeholder
  s = s.replace(/\.{3,}/g, ' __________ ');
  s = s.replace(/\t+/g, ' __________ ');
  
  // Remove trailing dash if it exists (and spaces around it)
  s = s.replace(/\s*-+\s*$/, '');
  
  // normalize multiple spaces
  s = s.replace(/\s{2,}/g, ' ');
  // remove spaces before question marks or punctuation if any
  s = s.replace(/\s+\?/g, '?');
  s = s.replace(/\s+\./g, '.');
  
  return s.trim();
}

for (let i = 0; i < lines.length; i++) {
  let rawLine = lines[i];
  let cleaned = cleanString(rawLine);

  if (cleaned.includes("## SENTENCE TRANSFORMATION")) {
    started = true;
    sectionStartLine = i;
    continue;
  }
  if (started && cleaned.includes("## COMPOSITION")) {
    ended = true;
    sectionEndLine = i;
    break;
  }
  if (!started || ended) continue;
  if (!cleaned.trim()) continue; // skip empty lines

  // Match: 1. Jack really likes football... (__crazy__)
  // We trim cleaned for regex matching to ignore leading/trailing space issues
  const kwMatch = cleaned.trim().match(/^(\d+)\.\s+(.*?)\s*\((?:__)?([A-Za-z\s']+)(?:__)?\)\s*$/);
  
  if (kwMatch) {
    if (currentItem) {
      if (currentItem.transformedPrompt) {
        currentItem.transformedPrompt = cleanMarkdownAndPlaceholders(currentItem.transformedPrompt);
      }
      qs.push(currentItem);
    }
    
    let rawNum = parseInt(kwMatch[1], 10);
    if (rawNum < lastRawNumber && lastRawNumber >= 49) {
      currentSet = 2; // reset detected in raw text
    }
    lastRawNumber = rawNum;

    currentItem = {
      id: `E_${internalCounter.toString().padStart(3, '0')}`,
      section: "E",
      type: "sentence_transformation",
      questionNumber: internalCounter,
      sourceQuestionNumber: internalCounter, // Follow requirement: 1..100
      setNumber: currentSet,
      originalSentence: cleanMarkdownAndPlaceholders(kwMatch[2]),
      keyword: kwMatch[3].trim(),
      transformedPrompt: "",
      answer: null,
      source: {
        datasetVersion: "hutech-b1-review-09-2025",
        sourceFile: "data/raw/hutech-b1-review-09-2025.raw.txt"
      }
    };
    internalCounter++;
  } else if (currentItem) {
    // This is part of the transformed prompt
    if (!cleaned.trim().match(/^(\d+)\.\s/)) { // Not a missed question
      if (currentItem.transformedPrompt) {
         currentItem.transformedPrompt += " " + cleaned;
      } else {
         currentItem.transformedPrompt = cleaned;
      }
    }
  }
}

if (currentItem) {
  if (currentItem.transformedPrompt) {
    currentItem.transformedPrompt = cleanMarkdownAndPlaceholders(currentItem.transformedPrompt);
  }
  qs.push(currentItem);
}

fs.writeFileSync(outPath, JSON.stringify(qs, null, 2), "utf8");

// Validation
const expectedCount = 100;
const actualCount = qs.length;

let minSq = 999;
let maxSq = 0;
const invalidSourceQuestionNumbers = [];
qs.forEach(q => {
  if (q.sourceQuestionNumber < minSq) minSq = q.sourceQuestionNumber;
  if (q.sourceQuestionNumber > maxSq) maxSq = q.sourceQuestionNumber;
  if (q.sourceQuestionNumber < 1 || q.sourceQuestionNumber > 100) {
    invalidSourceQuestionNumbers.push(q.id);
  }
});
const sqRange = `${minSq}..${maxSq}`;

const transformedPromptsContainingTab = qs.filter(q => q.transformedPrompt.includes('\t')).map(q => q.id);
const transformedPromptsContainingTrailingDash = qs.filter(q => q.transformedPrompt.match(/-$/)).map(q => q.id);
const missingKeywords = qs.filter(q => !q.keyword).map(q => q.id);
const missingTransformedPrompts = qs.filter(q => !q.transformedPrompt).map(q => q.id);

const mojibakeCount = qs.reduce((acc, q) => {
  const str = JSON.stringify(q);
  const matches = str.match(/ΓÇÿ|ΓÇÖ|ΓÇ£|ΓÇ¥|ΓÇª|ΓÇô|ΓÇö/g);
  return acc + (matches ? matches.length : 0);
}, 0);

console.log(`- sourceFileUsed = data/raw/hutech-b1-review-09-2025.raw.txt`);
console.log(`- sectionStartLine = ${sectionStartLine}`);
console.log(`- sectionEndLine = ${sectionEndLine}`);
console.log(`- expectedCount = ${expectedCount}`);
console.log(`- actualCount = ${actualCount}`);
console.log(`- sourceQuestionNumberRange = ${sqRange}`);
console.log(`- invalidSourceQuestionNumbers = ${JSON.stringify(invalidSourceQuestionNumbers)}`);
console.log(`- transformedPromptsContainingTab = ${JSON.stringify(transformedPromptsContainingTab)}`);
console.log(`- transformedPromptsContainingTrailingDash = ${JSON.stringify(transformedPromptsContainingTrailingDash)}`);
console.log(`- missingKeywords = ${JSON.stringify(missingKeywords)}`);
console.log(`- missingTransformedPrompts = ${JSON.stringify(missingTransformedPrompts)}`);
console.log(`- mojibakeRemainingCount = ${mojibakeCount}`);
