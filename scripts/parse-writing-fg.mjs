import fs from "fs";
import path from "path";

const rawPath = path.resolve("data/raw/hutech-b1-review-09-2025.raw.txt");
const fOutPath = path.resolve("data/parsed/section-f.json");
const gOutPath = path.resolve("data/parsed/section-g.json");

const rawText = fs.readFileSync(rawPath, "utf8");
const lines = rawText.split(/\r?\n/);

let state = "NONE"; // NONE, F, G
let fItems = [];
let gItems = [];
let currentItem = null;

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
  return s;
}

function cleanMarkdown(str) {
  let s = str;
  // Remove *, _
  s = s.replace(/[\*\_]/g, '');
  // Remove leading hyphens/bullets/spaces
  s = s.replace(/^[\-\s]+/, '');
  // normalize multiple spaces
  s = s.replace(/\s{2,}/g, ' ');
  return s.trim();
}

for (let i = 0; i < lines.length; i++) {
  let rawLine = lines[i];
  let cleaned = cleanString(rawLine);
  
  const checkStr = cleaned.replace(/_/g, '').toUpperCase();
  
  if (checkStr.includes("#### EMAILS & LETTERS")) {
    state = "F";
    continue;
  } else if (checkStr.includes("#### ESSAYS")) {
    if (currentItem) {
      if (state === "F") fItems.push(currentItem);
      currentItem = null;
    }
    state = "G";
    continue;
  } else if (state === "G" && (
    checkStr.includes("SPEAKING TOPICS") ||
    checkStr.includes("## LISTENING") ||
    checkStr === "LISTENING" ||
    checkStr.includes("__LISTENING__") ||
    checkStr.includes("TEXT 1:") ||
    checkStr.includes("LISTEN AND FILL") ||
    checkStr.includes("FILL THE BLANKS")
  )) {
    if (currentItem) {
      if (state === "G") gItems.push(currentItem);
      currentItem = null;
    }
    state = "DONE";
    break;
  }
  
  if (state === "NONE" || state === "DONE") continue;
  if (!cleaned.trim()) continue;

  // Match Topic X: with optional markdown around the colon
  const topicMatch = cleaned.trim().match(/^(?:__|\*)*Topic\s+(\d+)(?:__|\*)*:(?:__|\*)*\s*(.*)$/i);
  
  if (topicMatch) {
    if (currentItem) {
      if (state === "F") fItems.push(currentItem);
      else if (state === "G") gItems.push(currentItem);
    }
    
    const topicNum = parseInt(topicMatch[1], 10);
    const initialPrompt = cleanMarkdown(topicMatch[2]);
    
    if (state === "F") {
      currentItem = {
        id: `F_${topicNum.toString().padStart(3, '0')}`,
        section: "F",
        type: "email_letter_writing",
        questionNumber: topicNum,
        topicNumber: topicNum,
        prompt: initialPrompt,
        bulletPoints: [],
        wordLimit: { min: 150, max: null },
        autoScored: false,
        sampleAnswer: null,
        source: {
          datasetVersion: "hutech-b1-review-09-2025",
          sourceFile: "data/raw/hutech-b1-review-09-2025.raw.txt"
        }
      };
    } else if (state === "G") {
      currentItem = {
        id: `G_${topicNum.toString().padStart(3, '0')}`,
        section: "G",
        type: "essay_writing",
        questionNumber: topicNum,
        topicNumber: topicNum,
        prompt: initialPrompt,
        guidingQuestions: [],
        wordLimit: { min: 150, max: 200 },
        autoScored: false,
        sampleAnswer: null,
        source: {
          datasetVersion: "hutech-b1-review-09-2025",
          sourceFile: "data/raw/hutech-b1-review-09-2025.raw.txt"
        }
      };
    }
  } else if (currentItem) {
    // If it starts with - or *, it might be a bullet point
    if (cleaned.trim().startsWith('-') || cleaned.trim().startsWith('*')) {
      const bulletText = cleanMarkdown(cleaned);
      if (bulletText) {
        if (state === "F") {
          currentItem.bulletPoints.push(bulletText);
        } else if (state === "G") {
          currentItem.guidingQuestions.push(bulletText);
        }
      }
    } else {
      // Continuation of prompt or a bullet point that spans lines?
      const text = cleanMarkdown(cleaned);
      if (text) {
        if (state === "F") {
          if (currentItem.bulletPoints.length > 0) {
            currentItem.bulletPoints[currentItem.bulletPoints.length - 1] += " " + text;
          } else {
            currentItem.prompt += " " + text;
          }
        } else if (state === "G") {
          if (currentItem.guidingQuestions.length > 0) {
            currentItem.guidingQuestions[currentItem.guidingQuestions.length - 1] += " " + text;
          } else {
            currentItem.prompt += " " + text;
          }
        }
      }
    }
  }
}

if (currentItem) {
  if (state === "F") fItems.push(currentItem);
  else if (state === "G") gItems.push(currentItem);
}

fs.writeFileSync(fOutPath, JSON.stringify(fItems, null, 2), "utf8");
fs.writeFileSync(gOutPath, JSON.stringify(gItems, null, 2), "utf8");

// Validation
const sectionFExpectedCount = 20;
const sectionGExpectedCount = 20;
const sectionFActualCount = fItems.length;
const sectionGActualCount = gItems.length;

const fTopicsMissingBulletPoints = fItems.filter(f => f.bulletPoints.length === 0).map(f => f.id);
const gTopicsMissingPrompt = gItems.filter(g => !g.prompt).map(g => g.id);

const idSet = new Set();
const duplicateIds = [];
[...fItems, ...gItems].forEach(item => {
  if (idSet.has(item.id)) duplicateIds.push(item.id);
  idSet.add(item.id);
});

const mojibakeCount = [...fItems, ...gItems].reduce((acc, item) => {
  const str = JSON.stringify(item);
  const matches = str.match(/ΓÇÿ|ΓÇÖ|ΓÇ£|ΓÇ¥|ΓÇª|ΓÇô|ΓÇö/g);
  return acc + (matches ? matches.length : 0);
}, 0);

const malformedItems = [];
[...fItems, ...gItems].forEach(item => {
  if (item.autoScored !== false || item.sampleAnswer !== null) {
    malformedItems.push(item.id);
  }
});

const g20 = gItems.find(g => g.id === 'G_020');
const g20ContainsListening = g20 ? /listening|text 1|listen and fill|being a kid|speaking/i.test(g20.prompt) : false;
const gPromptsContainingListeningMarkers = gItems.filter(g => /listening|text 1|listen and fill|being a kid|speaking/i.test(g.prompt)).map(g => g.id);
const gPromptsLongerThan500Chars = gItems.filter(g => g.prompt.length > 500).map(g => g.id);

console.log(`- sourceFileUsed = data/raw/hutech-b1-review-09-2025.raw.txt`);
console.log(`- sectionFExpectedCount = ${sectionFExpectedCount}`);
console.log(`- sectionFActualCount = ${sectionFActualCount}`);
console.log(`- sectionGExpectedCount = ${sectionGExpectedCount}`);
console.log(`- sectionGActualCount = ${sectionGActualCount}`);
console.log(`- g20ContainsListening = ${g20ContainsListening}`);
console.log(`- gPromptsContainingListeningMarkers = ${JSON.stringify(gPromptsContainingListeningMarkers)}`);
console.log(`- gPromptsLongerThan500Chars = ${JSON.stringify(gPromptsLongerThan500Chars)}`);
console.log(`- fTopicsMissingBulletPoints = ${JSON.stringify(fTopicsMissingBulletPoints)}`);
console.log(`- gTopicsMissingPrompt = ${JSON.stringify(gTopicsMissingPrompt)}`);
console.log(`- duplicateIds = ${JSON.stringify(duplicateIds)}`);
console.log(`- mojibakeRemainingCount = ${mojibakeCount}`);
console.log(`- malformedItems = ${JSON.stringify(malformedItems)}`);
