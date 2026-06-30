import fs from "fs";
import path from "path";

const imgDir = path.resolve("images");
const signsDir = path.resolve("images/signs");
if (!fs.existsSync(signsDir)) {
  fs.mkdirSync(signsDir, { recursive: true });
}

const files = fs.readdirSync(imgDir).filter(f => f.includes("spd2m_image"));

let mapping = [];

files.forEach(file => {
  const match = file.match(/spd2m_image(\d+)\.(png|jpeg|jpg)$/i);
  if (match) {
    const originalNumber = parseInt(match[1]);
    const ext = match[2];
    const newName = `sign_${originalNumber.toString().padStart(3, '0')}.${ext}`;
    
    fs.copyFileSync(path.join(imgDir, file), path.join(signsDir, newName));
    
    mapping.push({
      oldFilename: file,
      newFilename: newName,
      questionNumber: originalNumber
    });
  }
});

mapping.sort((a, b) => a.questionNumber - b.questionNumber);

const mapDir = path.resolve("data/asset-maps");
if (!fs.existsSync(mapDir)) {
  fs.mkdirSync(mapDir, { recursive: true });
}

fs.writeFileSync(path.join(mapDir, "signs-image-map.json"), JSON.stringify(mapping, null, 2), "utf8");

console.log(`Normalized ${mapping.length} signs images.`);

let missing = [];
for (let i = 1; i <= 40; i++) {
  if (!mapping.find(m => m.questionNumber === i)) {
    missing.push(i);
  }
}
if (missing.length > 0) {
  console.log("Missing image numbers:", missing.join(", "));
} else {
  console.log("No missing image numbers from 1 to 40.");
}

const duplicates = mapping.filter((m, index, self) => 
  index !== self.findIndex(t => t.questionNumber === m.questionNumber)
);
if (duplicates.length > 0) {
  console.log("Duplicate image mappings found!");
} else {
  console.log("No duplicate image mappings.");
}
