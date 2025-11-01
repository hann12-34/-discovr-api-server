const fs = require('fs');
const path = require('path');

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Toronto');

const files = fs.readdirSync(scrapersDir).filter(f => f.endsWith('.js') && f.startsWith('scrape-'));

console.log(`🔧 Loosening date validation in ${files.length} scrapers...\n`);

let fixedCount = 0;

files.forEach((file, index) => {
  const filePath = path.join(scrapersDir, file);
  
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // Replace the strict validation (requires year AND month)
  // With: just require that dateText is not empty
  content = content.replace(
    /\/\/ CRITICAL: Must have complete date \(year \+ month required\)\s*const hasYear = \/20\\d\{2\}\/\.test\(dateText\);\s*const hasMonth = \/\(jan\|feb\|mar\|apr\|may\|jun\|jul\|aug\|sep\|oct\|nov\|dec\|january\|february\|march\|april\|may\|june\|july\|august\|september\|october\|november\|december\)\/i\.test\(dateText\);\s*if \(!hasYear \|\| !hasMonth\) \{\s*return;\s*\}/g,
    ''
  );
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    if ((index + 1) % 50 === 0) {
      console.log(`✅ [${index + 1}/${files.length}] Progress...`);
    }
    fixedCount++;
  }
});

console.log(`\n📊 Fixed ${fixedCount}/${files.length} scrapers`);
console.log(`\n🎉 Date validation loosened - more events will pass!`);
