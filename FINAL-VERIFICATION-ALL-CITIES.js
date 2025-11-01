const fs = require('fs');
const path = require('path');

const cities = ['New York', 'Toronto', 'Calgary', 'Montreal'];

console.log('🔍 FINAL VERIFICATION - All Cities Scraper Addresses\n');
console.log('='.repeat(70));

for (const city of cities) {
  const scrapersDir = path.join(__dirname, 'scrapers', 'cities', city);
  
  if (!fs.existsSync(scrapersDir)) {
    console.log(`\n❌ ${city}: Directory not found`);
    continue;
  }
  
  const files = fs.readdirSync(scrapersDir).filter(f => f.endsWith('.js') && !f.includes('test') && !f.includes('template'));
  
  let generic = 0;
  let real = 0;
  let noAddress = 0;
  
  const genericList = [];
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(scrapersDir, file), 'utf8');
    
    // Check for VENUE_ADDRESS constant
    const constMatch = content.match(/VENUE_ADDRESS\s*=\s*['"`](.+?)['"`]/);
    
    // Check for hardcoded venue addresses
    const venueMatch = content.match(/venue:\s*{\s*name:\s*['"`][^'"`]+['"`],\s*address:\s*['"`]([^'"`]+)['"`]/);
    
    const address = constMatch ? constMatch[1] : (venueMatch ? venueMatch[1] : null);
    
    if (!address) {
      noAddress++;
    } else if (address.match(/^(New York,?\s*NY|NYC Venue|Toronto,?\s*ON|Montreal,?\s*QC|Calgary,?\s*AB)$/i) || address.length < 15) {
      generic++;
      genericList.push({ file, address });
    } else {
      real++;
    }
  }
  
  const total = files.length;
  const coverage = total > 0 ? (real / total * 100).toFixed(1) : 0;
  
  console.log(`\n📍 ${city}:`);
  console.log(`   Total scrapers: ${total}`);
  console.log(`   ✅ Real addresses: ${real} (${coverage}%)`);
  console.log(`   ❌ Generic addresses: ${generic}`);
  console.log(`   ⚠️  No address found: ${noAddress}`);
  
  if (genericList.length > 0 && genericList.length <= 10) {
    console.log(`\n   Generic address files:`);
    genericList.forEach(({ file, address }) => {
      console.log(`      - ${file}: "${address}"`);
    });
  }
}

console.log('\n' + '='.repeat(70));
console.log('\n✅ VERIFICATION COMPLETE\n');
