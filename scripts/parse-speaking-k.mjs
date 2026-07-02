import fs from "fs";
import path from "path";

const rawPath = path.resolve("data/raw/hutech-b1-review-09-2025.raw.txt");
const outPath = path.resolve("data/parsed/section-k.json");

const rawText = fs.readFileSync(rawPath, "utf8");
const lines = rawText.split(/\r?\n/);

let state = "NONE"; // NONE, K, DONE
let kItems = [];
let currentItem = null;

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
    .replace(/∩¼â/g, "ffi") // Fix for "difficulty" ligature corruption
    .replace(/\\/g, ''); // remove backslashes
  return s;
}

function cleanMarkdown(str) {
  let s = str;
  // Remove *, _, and leading hyphens/bullets
  s = s.replace(/[\*\_]/g, '');
  s = s.replace(/^[\-\s]+/, '');
  // normalize multiple spaces
  s = s.replace(/\s{2,}/g, ' ');
  return s.trim();
}

for (let i = 0; i < lines.length; i++) {
  let rawLine = lines[i];
  
  // Skip base64 image data entirely
  if (rawLine.includes("data:image") || rawLine.includes("base64") || rawLine.includes("![](")) {
    continue;
  }
  
  let cleaned = cleanString(rawLine);
  let checkStr = cleaned.replace(/_/g, '').toUpperCase();
  
  if (state === "NONE") {
    if (checkStr === "SPEAKING TOPICS" || checkStr === "__SPEAKING TOPICS__") {
      state = "K";
      sectionStartLine = i;
    }
    continue;
  }
  
  if (state === "K") {
    if (
      checkStr.includes("READING - WRITING") ||
      checkStr.includes("READING – WRITING") ||
      checkStr.includes("PART I: READING") ||
      checkStr.includes("FORMAT ĐỀ KIỂM TRA") ||
      checkStr.includes("SAMPLE TESTS") ||
      rawLine.includes("Hß╗ÿI ─Éß╗ÆNG")
    ) {
      if (currentItem) {
        kItems.push(currentItem);
        currentItem = null;
      }
      state = "DONE";
      sectionEndLine = i;
      break;
    }
    
    if (!cleaned.trim()) continue;

    // Match Topic X:
    const topicMatch = cleaned.trim().match(/^(?:__|\*)*Topic\s+(\d+)(?:__|\*)*:(?:__|\*)*\s*(.*)$/i);
    
    if (topicMatch) {
      if (currentItem) {
        kItems.push(currentItem);
      }
      
      const topicNum = parseInt(topicMatch[1], 10);
      const initialPrompt = cleanMarkdown(topicMatch[2]);
      
      currentItem = {
        id: `K_${topicNum.toString().padStart(3, '0')}`,
        section: "K",
        type: "speaking_topic",
        questionNumber: topicNum,
        topicNumber: topicNum,
        prompt: initialPrompt,
        guidingQuestions: [],
        preparationTimeMinutes: 3,
        interactionTimeMinutes: {
          min: 5,
          max: 7
        },
        selectionMethod: "random_draw",
        autoScored: false,
        sampleAnswer: null,
        source: {
          datasetVersion: "hutech-b1-review-09-2025",
          sourceFile: "data/raw/hutech-b1-review-09-2025.raw.txt"
        }
      };
    } else if (currentItem) {
      // Skip the "You should answer the following questions" line and any variants
      const noMd = cleanMarkdown(cleaned).toLowerCase();
      if (noMd.includes("you should answer the following questions") || 
          noMd.includes("you should answer the questions") ||
          noMd.includes("you should answer questions") ||
          noMd.includes("candidates are supposed to cast lots")) {
        continue;
      }
      
      // If it starts with - or *, it might be a bullet point
      if (cleaned.trim().startsWith('-') || cleaned.trim().startsWith('*')) {
        const bulletText = cleanMarkdown(cleaned);
        if (bulletText) {
          currentItem.guidingQuestions.push(bulletText);
        }
      } else {
        const text = cleanMarkdown(cleaned);
        if (text) {
          if (currentItem.guidingQuestions.length > 0) {
            currentItem.guidingQuestions[currentItem.guidingQuestions.length - 1] += " " + text;
          } else {
            // Append to prompt if it's not a bullet point
            currentItem.prompt += " " + text;
          }
        }
      }
    }
  }
}

if (currentItem && state === "K") {
  kItems.push(currentItem);
}

fs.writeFileSync(outPath, JSON.stringify(kItems, null, 2), "utf8");

// Validation
const expectedCount = 50;
const actualCount = kItems.length;

let minSq = 999;
let maxSq = 0;
const missingTopicNumbers = [];
const idSet = new Set();
const duplicateTopicNumbers = [];
const duplicateIds = [];

const expectedTopicNumbers = new Set(Array.from({length: 50}, (_, i) => i + 1));

kItems.forEach(q => {
  if (idSet.has(q.id)) duplicateIds.push(q.id);
  idSet.add(q.id);
  
  if (expectedTopicNumbers.has(q.topicNumber)) {
    expectedTopicNumbers.delete(q.topicNumber);
  } else {
    duplicateTopicNumbers.push(q.topicNumber);
  }
});

expectedTopicNumbers.forEach(num => missingTopicNumbers.push(num));

const topicsMissingPrompt = kItems.filter(k => !k.prompt).map(k => k.id);
const topicsMissingGuidingQuestions = kItems.filter(k => k.guidingQuestions.length === 0).map(k => k.id);

const promptsContainingStopMarkers = kItems.filter(k => {
  const upper = k.prompt.toUpperCase();
  return upper.includes("READING - WRITING") || 
         upper.includes("READING – WRITING") || 
         upper.includes("PART I: READING") || 
         upper.includes("FORMAT ĐỀ KIỂM TRA") || 
         upper.includes("SAMPLE TESTS");
}).map(k => k.id);

const guidingQuestionsContainingStopMarkers = kItems.filter(k => {
  return k.guidingQuestions.some(gq => {
    const upper = gq.toUpperCase();
    return upper.includes("READING - WRITING") || 
           upper.includes("READING – WRITING") || 
           upper.includes("PART I: READING") || 
           upper.includes("FORMAT ĐỀ KIỂM TRA") || 
           upper.includes("SAMPLE TESTS");
  });
}).map(k => k.id);

const guidingQuestionsContainingInstructionLines = kItems.filter(k => 
  k.guidingQuestions.some(gq => /you should answer.*questions/i.test(gq))
).map(k => k.id);

const itemsContainingBase64Image = kItems.filter(k => 
  JSON.stringify(k).includes("data:image") || JSON.stringify(k).includes("base64")
).map(k => k.id);

const itemsContainingDataImage = kItems.filter(k => 
  JSON.stringify(k).includes("data:image")
).map(k => k.id);

const itemsContainingWeirdEncoding = kItems.filter(k => 
  JSON.stringify(k).includes("∩¼â")
).map(k => k.id);

const mojibakeCount = kItems.reduce((acc, k) => {
  const str = JSON.stringify(k);
  const matches = str.match(/ΓÇÿ|ΓÇÖ|ΓÇ£|ΓÇ¥|ΓÇª|ΓÇô|ΓÇö/g);
  return acc + (matches ? matches.length : 0);
}, 0);

const malformedItems = kItems.filter(k => {
  return k.autoScored !== false || 
         k.sampleAnswer !== null || 
         k.preparationTimeMinutes !== 3 || 
         k.selectionMethod !== "random_draw" ||
         k.interactionTimeMinutes.min !== 5 ||
         k.interactionTimeMinutes.max !== 7;
}).map(k => k.id);


console.log(`- sourceFileUsed = data/raw/hutech-b1-review-09-2025.raw.txt`);
console.log(`- sectionStartLine = ${sectionStartLine}`);
console.log(`- sectionEndLine = ${sectionEndLine}`);
console.log(`- expectedCount = ${expectedCount}`);
console.log(`- actualCount = ${actualCount}`);
console.log(`- missingTopicNumbers = ${JSON.stringify(missingTopicNumbers)}`);
console.log(`- duplicateTopicNumbers = ${JSON.stringify(duplicateTopicNumbers)}`);
console.log(`- topicsMissingPrompt = ${JSON.stringify(topicsMissingPrompt)}`);
console.log(`- topicsMissingGuidingQuestions = ${JSON.stringify(topicsMissingGuidingQuestions)}`);
console.log(`- promptsContainingStopMarkers = ${JSON.stringify(promptsContainingStopMarkers)}`);
console.log(`- guidingQuestionsContainingStopMarkers = ${JSON.stringify(guidingQuestionsContainingStopMarkers)}`);
console.log(`- guidingQuestionsContainingInstructionLines = ${JSON.stringify(guidingQuestionsContainingInstructionLines)}`);
console.log(`- itemsContainingBase64Image = ${JSON.stringify(itemsContainingBase64Image)}`);
console.log(`- itemsContainingDataImage = ${JSON.stringify(itemsContainingDataImage)}`);
console.log(`- itemsContainingWeirdEncoding = ${JSON.stringify(itemsContainingWeirdEncoding)}`);
console.log(`- duplicateIds = ${JSON.stringify(duplicateIds)}`);
console.log(`- mojibakeRemainingCount = ${mojibakeCount}`);
console.log(`- malformedItems = ${JSON.stringify(malformedItems)}`);
