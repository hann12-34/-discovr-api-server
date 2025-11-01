const fs = require('fs');
const path = require('path');

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Toronto');
const files = fs.readdirSync(scrapersDir).filter(f => f.endsWith('.js'));

console.log('📋 Remaining 96 Toronto venues needing addresses:\n');

const remaining = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(scrapersDir, file), 'utf8');
  
  if (content.match(/VENUE_ADDRESS\s*=\s*['"`]Toronto,?\s*ON['"`]/)) {
    const nameMatch = content.match(/VENUE_NAME\s*=\s*['"`](.+?)['"`]/);
    const venueName = nameMatch ? nameMatch[1] : 'Unknown';
    remaining.push({ file, venue: venueName });
    console.log(`❌ ${file.replace('.js', '')}`);
    console.log(`   ${venueName}\n`);
  }
}

console.log(`\n📊 Total remaining: ${remaining.length}`);

fs.writeFileSync('REMAINING-96-VENUES.json', JSON.stringify(remaining, null, 2));
console.log('✅ Saved to REMAINING-96-VENUES.json');
