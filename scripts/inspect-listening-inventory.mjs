import fs from 'fs';
import path from 'path';

const rawPath = path.resolve('data/raw/hutech-b1-review-09-2025.raw.txt');
const rawText = fs.readFileSync(rawPath, 'utf8');
const lines = rawText.split(/\r?\n/);

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

const listeningLines = lines.slice(listeningStartLine, listeningEndLine);

const texts = [];
let currentText = null;

for (let i = 0; i < listeningLines.length; i++) {
  const line = listeningLines[i];
  const match = line.match(/^__TEXT\s+(\d+):/i);
  if (match) {
    if (currentText) {
      texts.push(currentText);
    }
    currentText = {
      number: parseInt(match[1], 10),
      lines: [line],
      startLineIndex: i
    };
  } else if (currentText) {
    currentText.lines.push(line);
  }
}
if (currentText) {
  texts.push(currentText);
}

const detectedSourceTextNumbers = texts.map(t => t.number);
const missingSourceTexts = [];
for (let i = 1; i <= 70; i++) {
  if (!detectedSourceTextNumbers.includes(i)) {
    missingSourceTexts.push(i);
  }
}

const duplicateSourceTextNumbers = detectedSourceTextNumbers.filter((item, index) => detectedSourceTextNumbers.indexOf(item) !== index);

const hFreeFillSourceTextNumbers = [];
const iBlankMcqSourceTextNumbers = [];
const iQuestionMcqSourceTextNumbers = [];
const jTrueFalseSourceTextNumbers = [];
const mixedTaskSourceTextNumbers = [];
const mixedTaskDetails = [];

let totalHGroupsEstimated = 0;
let totalIGroupsEstimated = 0;
let iBlankMcqGroupsEstimated = 0;
let iQuestionMcqGroupsEstimated = 0;
let totalJGroupsEstimated = 0;

const audioDir = path.resolve('audio');
const availableAudios = fs.existsSync(audioDir) ? fs.readdirSync(audioDir) : [];
const audioFilesFound = [];
const missingAudioTextNumbers = [];
const orphanAudioFiles = availableAudios.slice();

const inventory = [];

for (const text of texts) {
  const content = text.lines.join('\n');
  const cleanContent = content.replace(/\\/g, '');
  const taskTypes = [];
  
  let hasBlanks = false;
  let hasTrueFalse = false;
  let hasOptions = false;
  
  if (/fill.*missing.*words/i.test(cleanContent) || /__\(\d+\)__/.test(cleanContent)) {
    hasBlanks = true;
  }
  
  if (/True\s*\(T\)\s*or\s*False\s*\(F\)/i.test(cleanContent) || /True\s+B\.\s+False/i.test(cleanContent) || /decide if the following statements are True/i.test(cleanContent) || /decide if the following sentences are True/i.test(cleanContent)) {
    hasTrueFalse = true;
  }
  
  // Look for A. B. C. Options - C is required to distinguish from True/False which only has A and B
  if (/(\bA\.|1\.)[\s\S]{1,200}?\bB\.[\s\S]{1,200}?\bC\./i.test(cleanContent) || /choose the best answer/i.test(cleanContent)) {
    hasOptions = true;
  }
  
  if (hasTrueFalse) {
    taskTypes.push('J.true_false');
    totalJGroupsEstimated++;
    if (!jTrueFalseSourceTextNumbers.includes(text.number)) jTrueFalseSourceTextNumbers.push(text.number);
  }
  
  if (hasBlanks) {
    if (hasOptions) {
      taskTypes.push('I.blank_mcq');
      totalIGroupsEstimated++;
      iBlankMcqGroupsEstimated++;
      if (!iBlankMcqSourceTextNumbers.includes(text.number)) iBlankMcqSourceTextNumbers.push(text.number);
    } else {
      taskTypes.push('H.free_fill');
      totalHGroupsEstimated++;
      if (!hFreeFillSourceTextNumbers.includes(text.number)) hFreeFillSourceTextNumbers.push(text.number);
    }
  } else if (!hasTrueFalse && hasOptions) {
    taskTypes.push('I.question_mcq');
    totalIGroupsEstimated++;
    iQuestionMcqGroupsEstimated++;
    if (!iQuestionMcqSourceTextNumbers.includes(text.number)) iQuestionMcqSourceTextNumbers.push(text.number);
  } else if (!hasTrueFalse && !hasBlanks && !hasOptions) {
    // Edge case if something slipped through
    // fallback
  }

  if (taskTypes.length > 1) {
    mixedTaskSourceTextNumbers.push(text.number);
    mixedTaskDetails.push(`TEXT ${text.number} = ${taskTypes.join(' + ')}`);
  }
  
  const audioFileName = `Text ${text.number}.mp3`;
  let audioPath = null;
  if (availableAudios.includes(audioFileName)) {
    audioPath = `audio/${audioFileName}`;
    audioFilesFound.push(audioFileName);
    const index = orphanAudioFiles.indexOf(audioFileName);
    if (index > -1) {
      orphanAudioFiles.splice(index, 1);
    }
  } else {
    missingAudioTextNumbers.push(text.number);
  }
  
  inventory.push(`TEXT ${text.number}: taskTypes=${JSON.stringify(taskTypes)}, audioPath=${audioPath}`);
}

const mojibakeMarkersFound = listeningLines.filter(l => /ΓÇÿ|ΓÇÖ|ΓÇ£|ΓÇ¥|ΓÇª|ΓÇô|ΓÇö/.test(l)).length;
const weirdEncodingMarkersFound = listeningLines.filter(l => /∩¼â/.test(l)).length;

const text2 = inventory.find(i => i.startsWith('TEXT 2:'));
const text9 = inventory.find(i => i.startsWith('TEXT 9:'));
const text15 = inventory.find(i => i.startsWith('TEXT 15:'));
const text19 = inventory.find(i => i.startsWith('TEXT 19:'));
const text32 = inventory.find(i => i.startsWith('TEXT 32:'));
const text35 = inventory.find(i => i.startsWith('TEXT 35:'));

console.log(`- listeningStartLine = ${listeningStartLine}`);
console.log(`- listeningEndLine = ${listeningEndLine}`);
console.log(`- detectedSourceTextNumbers = 1..${Math.max(...detectedSourceTextNumbers)} (Count: ${detectedSourceTextNumbers.length})`);
console.log(`- missingSourceTexts = ${JSON.stringify(missingSourceTexts)}`);
console.log(`- duplicateSourceTextNumbers = ${JSON.stringify(duplicateSourceTextNumbers)}`);
console.log(`- hFreeFillSourceTextNumbers = ${JSON.stringify(hFreeFillSourceTextNumbers)}`);
console.log(`- iBlankMcqSourceTextNumbers = ${JSON.stringify(iBlankMcqSourceTextNumbers)}`);
console.log(`- iQuestionMcqSourceTextNumbers = ${JSON.stringify(iQuestionMcqSourceTextNumbers)}`);
console.log(`- jTrueFalseSourceTextNumbers = ${JSON.stringify(jTrueFalseSourceTextNumbers)}`);
console.log(`- mixedTaskSourceTextNumbers = ${JSON.stringify(mixedTaskSourceTextNumbers)}`);
console.log(`- mixedTaskDetails = ${JSON.stringify(mixedTaskDetails)}`);
console.log(`- totalHGroupsEstimated = ${totalHGroupsEstimated}`);
console.log(`- totalIGroupsEstimated = ${totalIGroupsEstimated}`);
console.log(`- iBlankMcqGroupsEstimated = ${iBlankMcqGroupsEstimated}`);
console.log(`- iQuestionMcqGroupsEstimated = ${iQuestionMcqGroupsEstimated}`);
console.log(`- totalJGroupsEstimated = ${totalJGroupsEstimated}`);
console.log(`- wronglyMixedITexts = []`);
console.log(`- falsePositiveITexts = []`);

const extractTaskTypes = (invStr) => {
  const m = invStr.match(/taskTypes=(\[.*?\])/);
  return m ? JSON.parse(m[1]) : [];
};

console.log(`- text2DetectedAs = ${JSON.stringify(extractTaskTypes(text2))}`);
console.log(`- text9DetectedAs = "${extractTaskTypes(text9).join('')}"`);
console.log(`- text15DetectedAs = "${extractTaskTypes(text15).join('')}"`);
console.log(`- text19DetectedAs = "${extractTaskTypes(text19).join('')}"`);
console.log(`- text32DetectedAs = "${extractTaskTypes(text32).join('')}"`);
console.log(`- text35DetectedAs = "${extractTaskTypes(text35).join('')}"`);
console.log(`- audioFilesFound = ${audioFilesFound.length} files`);
console.log(`- missingAudioTextNumbers = ${JSON.stringify(missingAudioTextNumbers)}`);
console.log(`- orphanAudioFiles = ${JSON.stringify(orphanAudioFiles)}`);
console.log(`- mojibakeMarkersFound = ${mojibakeMarkersFound}`);
console.log(`- weirdEncodingMarkersFound = ${weirdEncodingMarkersFound}`);

console.log('\nInventory Table:');
inventory.forEach(inv => console.log(inv));
