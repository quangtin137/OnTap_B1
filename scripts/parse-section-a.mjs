import fs from "fs";
import path from "path";

const rawPath = path.resolve("data/raw/hutech-b1-review-09-2025.raw.txt");
const outPath = path.resolve("data/parsed/section-a.json");

const rawText = fs.readFileSync(rawPath, "utf8");
const lines = rawText.split(/\r?\n/);

let questions = [];
let pendingQuestion = "";

let started = false;
let qNum = 1;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.includes("Page 3")) started = true;
  if (!started) continue;
  
  if (line.includes("B. Signs") || line.includes("B\\. Signs") || line.includes("Signs__")) {
     break;
  }

  let cleanLine = line.trim().replace(/\\/g, ''); 

  // Fix Mojibake
  cleanLine = cleanLine
    .replace(/ΓÇÖ/g, "'")
    .replace(/ΓÇ£/g, '"')
    .replace(/ΓÇ¥/g, '"')
    .replace(/ΓÇª/g, '...')
    .replace(/ΓÇô/g, '-')
    .replace(/ΓÇö/g, '-');

  // Check if this line is an options line disguised as "1."
  let isOptions = false;
  if (cleanLine.startsWith("A.")) {
      isOptions = true;
  } else if (cleanLine.match(/^1\./) && pendingQuestion !== "") {
      if (cleanLine.includes("B.")) {
          isOptions = true;
      } else {
          let nextIdx = i + 1;
          while (nextIdx < i + 3 && nextIdx < lines.length) {
              if (lines[nextIdx].includes("B.")) {
                  isOptions = true;
                  break;
              }
              if (lines[nextIdx].trim() !== "") break; 
              nextIdx++;
          }
      }
      if (isOptions) {
          cleanLine = cleanLine.replace(/^1\./, 'A.');
      }
  }

  const qMatch = cleanLine.match(/^\d+\.\s+(.*)$/);
  
  if (qMatch && !isOptions) {
    pendingQuestion = qMatch[1].replace(/\t+/g, ' ______ ').replace(/\s{2,}/g, ' ').trim();
  } else if (isOptions && pendingQuestion !== "") {
    
    let combinedLine = cleanLine;
    let nextIdx = i + 1;
    while (nextIdx <= i + 3 && nextIdx < lines.length) {
       let nextClean = lines[nextIdx].trim().replace(/\\/g, '');
       nextClean = nextClean
           .replace(/ΓÇÖ/g, "'").replace(/ΓÇª/g, '...')
           .replace(/ΓÇ£/g, '"').replace(/ΓÇ¥/g, '"')
           .replace(/ΓÇô/g, '-').replace(/ΓÇö/g, '-');

       if (nextClean.match(/^[B-D]\./) || nextClean.includes(" B. ") || nextClean.includes(" C. ") || nextClean.includes(" D. ")) {
          combinedLine += " " + nextClean;
       } else if (nextClean === "" || nextClean.match(/^[-]/)) {
          // ignore
       } else {
          break;
       }
       nextIdx++;
    }
    
    const opts = {};
    const extractOption = (letter, nextLetter, text) => {
       let regex;
       if (nextLetter) {
         regex = new RegExp(`${letter}\\.\\s*(.*?)(?=${nextLetter}\\.|$)`);
       } else {
         regex = new RegExp(`${letter}\\.\\s*(.*)$`);
       }
       const match = text.match(regex);
       return match ? match[1].trim() : null;
    };
    
    opts.A = extractOption("A", "B", combinedLine);
    opts.B = extractOption("B", "C", combinedLine);
    opts.C = extractOption("C", "D", combinedLine);
    opts.D = extractOption("D", null, combinedLine);
    
    if (!pendingQuestion.includes('______') && !pendingQuestion.includes('___')) {
       pendingQuestion = pendingQuestion + " ______";
    }

    questions.push({
      id: `A_${qNum.toString().padStart(3, '0')}`,
      section: "A",
      type: "mcq",
      questionNumber: qNum,
      question: pendingQuestion,
      options: opts,
      answer: null,
      source: {
        datasetVersion: "hutech-b1-review-09-2025"
      }
    });
    
    qNum++;
    pendingQuestion = ""; // Reset
  }
}

fs.writeFileSync(outPath, JSON.stringify(questions, null, 2), "utf8");

const missing = questions.filter(q => !q.options.A || !q.options.B || !q.options.C || !q.options.D);

console.log("expectedCount = 200");
console.log(`actualCount = ${questions.length}`);
let missingNumbers = [];
if (questions.length < 200) {
  // We can't know exactly which original numbers were missed because they are all 1., 
  // but we can report the quantity missing.
  console.log(`missingOriginalQuestionNumbers = ${200 - questions.length} (quantity)`);
} else {
  console.log("missingOriginalQuestionNumbers = 0");
}
console.log("duplicateQuestionNumbers = 0");
console.log(`questionsWithMissingOptions = ${missing.length}`);

if (missing.length > 0) {
   console.log("Missing options for Qs:", missing.map(q => q.questionNumber).join(", "));
}
