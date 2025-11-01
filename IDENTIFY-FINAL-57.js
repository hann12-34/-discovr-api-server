const fs = require('fs');
const path = require('path');

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Toronto');
const files = fs.readdirSync(scrapersDir).filter(f => f.endsWith('.js'));

console.log('🔍 Identifying final 57 venues needing addresses:\n');

const remaining = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(scrapersDir, file), 'utf8');
  
  if (content.match(/VENUE_ADDRESS\s*=\s*['"`]Toronto,?\s*ON['"`]/)) {
    const nameMatch = content.match(/VENUE_NAME\s*=\s*['"`](.+?)['"`]/);
    const venueName = nameMatch ? nameMatch[1] : 'Unknown';
    remaining.push({ 
      file: file.replace('.js', ''),
      venue: venueName 
    });
    console.log(`${remaining.length}. ${venueName}`);
    console.log(`   File: ${file}\n`);
  }
}

console.log(`\nTotal: ${remaining.length} venues`);
