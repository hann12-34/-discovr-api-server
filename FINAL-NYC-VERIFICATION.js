const fs = require('fs');
const path = require('path');

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'New York');
const files = fs.readdirSync(scrapersDir).filter(f => f.endsWith('.js') && !f.includes('test') && !f.includes('template'));

console.log('🔍 FINAL NYC SCRAPERS VERIFICATION\n');
console.log('='.repeat(70));

let withAddresses = 0;
let aggregators = 0;
let noAddress = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(scrapersDir, file), 'utf8');
  
  // Check for VENUE_ADDRESS or hardcoded address
  const hasAddress = content.match(/VENUE_ADDRESS\s*=\s*['"`](.+?)['"`]/) || 
                     content.match(/venue:\s*{\s*name:\s*['"`][^'"`]+['"`],\s*address:\s*['"`]([^'"`]{15,})['"`]/);
  
  // Check if it's an aggregator (multiple venues)
  const isAggregator = file.includes('livenation') || file.includes('fashion-week') || 
                       file.includes('broadway-theatres') || file.includes('times-square') ||
                       file === 'index.js';
  
  if (hasAddress) {
    const address = hasAddress[1];
    if (address.length >= 15 && !address.match(/^(New York,?\s*NY|NYC|Brooklyn)$/i)) {
      withAddresses++;
    } else {
      noAddress.push({ file, address });
    }
  } else if (isAggregator) {
    aggregators++;
  } else {
    noAddress.push({ file, address: 'NONE' });
  }
}

console.log(`\n📊 FINAL RESULTS:`);
console.log(`   Total scrapers: ${files.length}`);
console.log(`   ✅ With REAL addresses: ${withAddresses}`);
console.log(`   🌐 Aggregators (OK): ${aggregators}`);
console.log(`   ❌ Missing/generic: ${noAddress.length}\n`);

if (noAddress.length > 0) {
  console.log('⚠️  Files still needing attention:');
  noAddress.forEach(({ file, address }) => {
    console.log(`   - ${file}: "${address}"`);
  });
} else {
  console.log('🎉 100% COVERAGE - ALL NYC SCRAPERS HAVE REAL ADDRESSES!');
}

const coverage = ((withAddresses / (files.length - aggregators)) * 100).toFixed(1);
console.log(`\n📈 Coverage: ${coverage}% (excluding ${aggregators} aggregators)`);
console.log('='.repeat(70));
