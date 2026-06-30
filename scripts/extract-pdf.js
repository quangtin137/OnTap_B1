const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const pdfPath = path.resolve('docs/signs-clean.pdf');
const txtPath = path.resolve('data/raw/signs-clean.raw.txt');

async function extract() {
  const dataBuffer = fs.readFileSync(pdfPath);
  try {
    const data = await pdf(dataBuffer);
    fs.writeFileSync(txtPath, data.text, 'utf8');
    console.log(`Extracted text to ${txtPath}`);
  } catch (err) {
    console.error("Error extracting PDF:", err);
  }
}

extract();
