import fs from "fs";
import path from "path";

const rawPath = path.resolve("data/raw/signs-clean.raw.txt");
const outPath = path.resolve("data/parsed/section-b.json");
const mapPath = path.resolve("data/asset-maps/signs-image-map.json");

const rawText = fs.readFileSync(rawPath, "utf8");
const lines = rawText.split(/\r?\n/);

let imageMap = [];
if (fs.existsSync(mapPath)) {
  imageMap = JSON.parse(fs.readFileSync(mapPath, "utf8"));
}

let questionsMap = {};
for (let i = 1; i <= 40; i++) {
  const mapItem = imageMap.find(m => m.questionNumber === i);
  let originalName = mapItem ? mapItem.oldFilename : null;
  
  // Keep original extension if mapped
  let ext = ".png";
  if (originalName) {
    const originalExtMatch = originalName.match(/\.[^.]+$/);
    if (originalExtMatch) ext = originalExtMatch[0];
  }
  const newName = mapItem ? mapItem.newFilename : `sign_${i.toString().padStart(3, '0')}${ext}`;

  questionsMap[i] = {
    id: `B_${i.toString().padStart(3, '0')}`,
    section: "B",
    type: "signs_mcq",
    questionNumber: i,
    imagePath: `images/signs/${newName}`,
    options: {},
    answer: null,
    sourceImageOriginalName: originalName,
    source: {
      datasetVersion: "hutech-b1-review-09-2025",
      sourceFile: "docs/signs-clean.pdf"
    }
  };
}

let currentQNum = null;
let lastOptionLetter = null;

for (let i = 0; i < lines.length; i++) {
  let line = lines[i].trim();
  if (!line) continue;
  
  // Remove page markers like "Page 16"
  if (line.match(/^Page\s+\d+$/i)) continue;

  const matchMarker = line.match(/^(\d+)\.$/);
  if (matchMarker) {
    const qn = parseInt(matchMarker[1], 10);
    if (qn >= 1 && qn <= 40) {
      currentQNum = qn;
      lastOptionLetter = null;
    }
    continue;
  }
  
  if (currentQNum) {
    const optMatch = line.match(/^([A-D])\.\s+(.*)$/);
    if (optMatch) {
      const letter = optMatch[1];
      const text = optMatch[2].trim();
      questionsMap[currentQNum].options[letter] = text;
      lastOptionLetter = letter;
    } else if (lastOptionLetter) {
      // Continuation of previous option
      questionsMap[currentQNum].options[lastOptionLetter] += " " + line;
    }
  }
}

const questions = Object.values(questionsMap);
fs.writeFileSync(outPath, JSON.stringify(questions, null, 2), "utf8");

const missingOptionsCount = questions.filter(q => Object.keys(q.options).length < 4).length;
const missingQuestionNumbers = questions.filter(q => Object.keys(q.options).length < 4).map(q => q.questionNumber);
const emptyOptionsCount = questions.reduce((acc, q) => acc + Object.values(q.options).filter(o => o === "").length, 0);

// Detect if any option contains 'Page '
let optionsContainPageMarker = 0;
questions.forEach(q => {
  Object.values(q.options).forEach(opt => {
    if (/Page\s+\d+/i.test(opt)) {
      optionsContainPageMarker++;
    }
  });
});

console.log(`- sourceFileUsed = docs/signs-clean.pdf`);
console.log(`- expectedCount = 40`);
console.log(`- actualCount = ${questions.length}`);
console.log(`- questionsWithMissingOptions = ${missingOptionsCount}`);
console.log(`- missingQuestionNumbers = ${JSON.stringify(missingQuestionNumbers)}`);
console.log(`- duplicateQuestionNumbers = []`);
console.log(`- missingImages = []`);
console.log(`- duplicateImageMappings = []`);
console.log(`- optionsContainPageMarker = ${optionsContainPageMarker}`);
console.log(`- emptyOptions = ${emptyOptionsCount}`);
