const fs = require('fs');
const path = require('path');

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Toronto');
const files = fs.readdirSync(scrapersDir).filter(f => f.endsWith('.js') && f.startsWith('scrape-'));

console.log(`🔧 Improving headers in ${files.length} scrapers...\n`);

let fixedCount = 0;

files.forEach((file, index) => {
  const filePath = path.join(scrapersDir, file);
  
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // Replace basic User-Agent with getBrowserHeaders()
  // Pattern 1: headers: { 'User-Agent': '...' }
  if (content.includes("'User-Agent': 'Mozilla/5.0")) {
    content = content.replace(
      /headers:\s*\{\s*'User-Agent':\s*'[^']+'\s*\}/g,
      "headers: require('../../utils/city-util').getBrowserHeaders()"
    );
  }
  
  // Pattern 2: timeout but no headers
  if (content.includes('timeout:') && !content.includes('headers:')) {
    content = content.replace(
      /(axios\.get\([^,]+,\s*\{)\s*(timeout:)/g,
      "$1\n      headers: require('../../utils/city-util').getBrowserHeaders(),\n      $2"
    );
  }
  
  // Add getBrowserHeaders to imports if not present
  if (content.includes("getBrowserHeaders()") && !content.includes("getBrowserHeaders")) {
    content = content.replace(
      /const \{ ([^}]+) \} = require\('\.\.\/\.\.\/utils\/city-util'\);/,
      "const { $1, getBrowserHeaders } = require('../../utils/city-util');"
    );
  }
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    if ((index + 1) % 50 === 0) {
      console.log(`✅ [${index + 1}/${files.length}]`);
    }
    fixedCount++;
  }
});

console.log(`\n📊 Fixed ${fixedCount}/${files.length} scrapers`);
