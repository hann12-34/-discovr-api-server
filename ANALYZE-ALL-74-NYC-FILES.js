const fs = require('fs');
const path = require('path');

const noAddressList = JSON.parse(fs.readFileSync('NYC-NO-ADDRESS-LIST.json', 'utf8'));

console.log('🔍 Analyzing all 74 NYC files without addresses...\n');

const stubs = [];
const working = [];
const duplicates = [];

for (const item of noAddressList) {
  const filePath = path.join(__dirname, 'scrapers', 'cities', 'New York', item.file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${item.file}`);
    continue;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').length;
  
  // Check if it's a stub (returns empty array)
  if (content.includes('return filterEvents([])') || content.includes('return []')) {
    stubs.push({ file: item.file, lines });
  }
  // Check if it has actual scraping logic
  else if (content.includes('events.push(') && content.includes('cheerio')) {
    working.push({ file: item.file, lines });
  }
  else {
    duplicates.push({ file: item.file, lines });
  }
}

console.log(`📊 RESULTS:\n`);
console.log(`🔴 STUBS (return empty): ${stubs.length}`);
console.log(`✅ WORKING (have scraping logic): ${working.length}`);
console.log(`❓ OTHER (need manual check): ${duplicates.length}\n`);

console.log(`\n✅ WORKING scrapers (${working.length}):`);
working.forEach(s => console.log(`   - ${s.file} (${s.lines} lines)`));

fs.writeFileSync('NYC-74-CATEGORIZED.json', JSON.stringify({ stubs, working, duplicates }, null, 2));
console.log(`\n✅ Saved analysis to NYC-74-CATEGORIZED.json`);
