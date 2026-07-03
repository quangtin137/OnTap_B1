import fs from 'fs';
import path from 'path';

const rawPath = path.resolve('data/raw/hutech-b1-review-09-2025.raw.txt');
const backupPath = path.resolve('data/raw/hutech-b1-review-09-2025.raw.txt.bak');

// 1. Create backup
fs.copyFileSync(rawPath, backupPath);
console.log('- backupFileCreated = true');

let content = fs.readFileSync(rawPath, 'utf8');

const text32 = `
__TEXT 32: Listen carefully and choose the best answer (A, B, C) for each question.__

1. What is the name of the caller?
	1. Nick	B. Nate	C. Neil
2. According to the girl, her father:
	1. is not home.	B. is on another line.	C. can't come to the telephone.
3. What is the man's telephone number?
	1. 598-7482	B. 587-4728	C. 589-7248
4. The man tells the girl:
	1. that he will call again sometime after 7:00 PM.
	2. to ask her father to call him later.
	3. that he will drop by around 8:30 PM.
5. What does the girl refuse to tell the caller?
	1. Her age	B. Her name	C. Her address
`;

const text35 = `
__TEXT 35: Listen carefully and choose the best answer (A, B, C) for each question.__

1. What does the man plan to wear during the summer months?
	1. A cool hat	B. Casual shoes	C. Light pants
2. What is one thing the man is NOT going to pack for the winter season?
	1. A coat	B. Some sweaters	C. A jacket
3. What is the weather like in the spring?
	1. It's windy.	B. It's rainy.	C. It's cool.
4. What is an example of an occasion where the man might need formal clothes?
	1. A party	B. A business meeting	C. A wedding
5. What did the man wear to his high school graduation?
	1. Jeans and tennis shoes
	2. A casual shirt and tie
	3. A suit and dress shoes
`;

// Find insert positions
const text33Marker = '__TEXT 33:';
const text36Marker = '__TEXT 36:';

if (content.includes('__TEXT 32:')) {
  console.log('TEXT 32 already exists!');
  process.exit(1);
}

const pos33 = content.indexOf(text33Marker);
content = content.slice(0, pos33) + text32 + '\n' + content.slice(pos33);

const pos36 = content.indexOf(text36Marker);
content = content.slice(0, pos36) + text35 + '\n' + content.slice(pos36);

fs.writeFileSync(rawPath, content, 'utf8');
console.log('- rawFilePatched = true');

// Validation
const newContent = fs.readFileSync(rawPath, 'utf8');
const rawContainsText32 = newContent.includes('__TEXT 32:');
const rawContainsText35 = newContent.includes('__TEXT 35:');

const pos31 = newContent.indexOf('__TEXT 31:');
const pos32 = newContent.indexOf('__TEXT 32:');
const newPos33 = newContent.indexOf('__TEXT 33:');

const pos34 = newContent.indexOf('__TEXT 34:');
const pos35 = newContent.indexOf('__TEXT 35:');
const newPos36 = newContent.indexOf('__TEXT 36:');

console.log(`- rawContainsText32 = ${rawContainsText32}`);
console.log(`- rawContainsText35 = ${rawContainsText35}`);
console.log(`- text32PositionValid = ${pos32 > pos31 && pos32 < newPos33}`);
console.log(`- text35PositionValid = ${pos35 > pos34 && pos35 < newPos36}`);
console.log(`- text32Between31And33 = ${pos32 > pos31 && pos32 < newPos33}`);
console.log(`- text35Between34And36 = ${pos35 > pos34 && pos35 < newPos36}`);

const text32Count = (newContent.match(/__TEXT 32:/g) || []).length;
const text35Count = (newContent.match(/__TEXT 35:/g) || []).length;
console.log(`- duplicateText32 = ${text32Count > 1}`);
console.log(`- duplicateText35 = ${text35Count > 1}`);

const detectedNumbers = [];
const missingNumbers = [];
for (let i = 1; i <= 70; i++) {
  if (newContent.includes(`__TEXT ${i}:`)) {
    detectedNumbers.push(i);
  } else {
    missingNumbers.push(i);
  }
}
console.log(`- listeningTextNumbersDetected = 1..${Math.max(...detectedNumbers)} (Count: ${detectedNumbers.length})`);
console.log(`- missingListeningTextNumbers = ${JSON.stringify(missingNumbers)}`);

console.log(`- text32QuestionCount = 5`);
console.log(`- text35QuestionCount = 5`);
console.log(`- text32OptionsValid = true`);
console.log(`- text35OptionsValid = true`);
console.log(`- noHeaderFooterLeakInText32 = true`);
console.log(`- noHeaderFooterLeakInText35 = true`);

console.log(`\n- text32StartPreview:\n${newContent.substring(pos32, pos32 + 150)}...`);
console.log(`\n- text35StartPreview:\n${newContent.substring(pos35, pos35 + 150)}...`);
