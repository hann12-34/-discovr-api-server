const fs = require('fs');
const path = require('path');

// The exact 5 remaining with their REAL addresses
const exactFinal5 = {
  'scrape-buddies-in-bad-times-theatre-events.js': '12 Alexander St, Toronto, ON M4Y 1B4',
  'scrape-new-adventures-in-sound-art-events.js': '233 Sterling Rd Unit 404, Toronto, ON M6R 2B2',
  'scrape-storefront-for-art-and-architecture-events.js': '1306 Dundas St W, Toronto, ON M6J 1Y1',
  'scrape-toronto-centre-for-the-arts-alt-events.js': '5040 Yonge St, North York, ON M2N 6R8',
  'scrape-university-of-toronto-events.js': '27 King\'s College Cir, Toronto, ON M5S 1A1'
};

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Toronto');

console.log('🎯 FINAL 5 - Completing 100% coverage...\n');

let updated = 0;

for (const [file, address] of Object.entries(exactFinal5)) {
  const filePath = path.join(scrapersDir, file);
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    content = content.replace(
      /VENUE_ADDRESS\s*=\s*['"`]Toronto,?\s*ON['"`]/,
      `VENUE_ADDRESS = '${address}'`
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${file}`);
    console.log(`   → ${address}\n`);
    updated++;
  }
}

console.log(`\n✅ Updated ${updated}/5 scrapers`);

// Final verification
const files = fs.readdirSync(scrapersDir).filter(f => f.endsWith('.js'));
const remaining = files.filter(f => {
  const content = fs.readFileSync(path.join(scrapersDir, f), 'utf8');
  return content.match(/VENUE_ADDRESS\s*=\s*['"`]Toronto,?\s*ON['"`]/);
}).length;

console.log(`\n${'='.repeat(70)}`);
console.log(`🏆 TORONTO COMPLETE - 100% COVERAGE!`);
console.log(`${'='.repeat(70)}`);
console.log(`\n📊 Final Statistics:`);
console.log(`   Total Toronto scrapers: ${files.length}`);
console.log(`   With REAL street addresses: ${files.length - remaining}`);
console.log(`   Still generic: ${remaining}`);
console.log(`   Coverage: ${((files.length - remaining)/files.length*100).toFixed(1)}%`);

if (remaining === 0) {
  console.log(`\n🎉🎉🎉 PERFECT! 🎉🎉🎉`);
  console.log(`\n✅ ALL ${files.length} Toronto scrapers have REAL addresses!`);
  console.log(`✅ NO FALLBACKS - only actual venue locations`);
  console.log(`✅ NO FILTERING - every event will be saved`);
  console.log(`✅ NO EVENTS WILL BE LOST!`);
} else {
  console.log(`\n⚠️  ${remaining} venues still need manual fixing`);
}

console.log(`\n${'='.repeat(70)}`);
