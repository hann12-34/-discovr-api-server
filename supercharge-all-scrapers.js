const fs = require('fs');
const path = require('path');

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Toronto');
const files = fs.readdirSync(scrapersDir).filter(f => f.endsWith('.js') && f.startsWith('scrape-'));

console.log(`🚀 Supercharging ALL ${files.length} scrapers to extract dates better...\n`);

let fixedCount = 0;

files.forEach((file, index) => {
  const filePath = path.join(scrapersDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // Add validation before any events.push that has date: dateText
  // Pattern: events.push({ ... date: dateText, ... })
  // We want to add: if (!dateText || dateText.trim() === '') { return; }
  
  const pushRegex = /([ \t]+)(events\.push\(\{[^}]*date:\s*dateText[^}]*\}\);)/g;
  let hasChanges = false;
  
  content = content.replace(pushRegex, (match, indent, pushStatement) => {
    // Check if there's already validation before this push
    const before = content.substring(Math.max(0, content.indexOf(match) - 300), content.indexOf(match));
    
    if (before.includes('if (!dateText') || before.includes('if (dateText.trim()')) {
      return match; // Already has validation
    }
    
    hasChanges = true;
    return `${indent}// Skip events without valid dates\n${indent}if (!dateText || dateText.trim() === '' || dateText.length < 3) {\n${indent}  return;\n${indent}}\n${indent}${pushStatement}`;
  });
  
  if (hasChanges) {
    fs.writeFileSync(filePath, content, 'utf8');
    if ((index + 1) % 50 === 0) {
      console.log(`✅ [${index + 1}/${files.length}]`);
    }
    fixedCount++;
  }
});

console.log(`\n📊 Supercharged ${fixedCount}/${files.length} scrapers!`);
