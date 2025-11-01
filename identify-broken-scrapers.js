/**
 * Identify scrapers that hardcode null dates or are missing address fields
 */

const fs = require('fs');
const path = require('path');

const cities = ['Vancouver', 'Montreal', 'Toronto', 'Calgary', 'New York'];

const results = {
  nullDates: [],
  noAddress: [],
  stubs: []
};

cities.forEach(city => {
  const cityDir = `scrapers/cities/${city}`;
  
  if (!fs.existsSync(cityDir)) return;
  
  const files = fs.readdirSync(cityDir).filter(f => f.endsWith('.js') && !f.includes('test') && !f.includes('backup'));
  
  files.forEach(file => {
    const filePath = path.join(cityDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for hardcoded null dates
    if (content.match(/date:\s*null/i)) {
      results.nullDates.push({ city, file, line: 'hardcoded null' });
    }
    
    // Check for missing address in venue objects
    if (content.includes('venue:') && !content.includes('address:')) {
      // Only flag if it's actually creating events
      if (content.includes('events.push')) {
        results.noAddress.push({ city, file });
      }
    }
    
    // Check for stub scrapers
    if (content.includes('return [];') && !content.includes('events.push')) {
      results.stubs.push({ city, file });
    }
  });
});

console.log('🔍 BROKEN SCRAPER ANALYSIS\n');
console.log('='.repeat(80));

console.log(`\n❌ SCRAPERS WITH HARDCODED NULL DATES (${results.nullDates.length}):`);
results.nullDates.forEach(({ city, file, line }) => {
  console.log(`   ${city}/${file} - ${line}`);
});

console.log(`\n📍 SCRAPERS MISSING ADDRESS FIELD (${results.noAddress.length}):`);
const byCity = {};
results.noAddress.forEach(({ city, file }) => {
  if (!byCity[city]) byCity[city] = [];
  byCity[city].push(file);
});

Object.entries(byCity).forEach(([city, files]) => {
  console.log(`\n   ${city} (${files.length} scrapers):`);
  files.slice(0, 10).forEach(f => console.log(`      - ${f}`));
  if (files.length > 10) console.log(`      ... and ${files.length - 10} more`);
});

console.log(`\n🚧 STUB SCRAPERS (${results.stubs.length}):`);
Object.entries(results.stubs.reduce((acc, { city, file }) => {
  if (!acc[city]) acc[city] = [];
  acc[city].push(file);
  return acc;
}, {})).forEach(([city, files]) => {
  console.log(`   ${city}: ${files.length} stubs`);
});

console.log('\n' + '='.repeat(80));
console.log('🎯 PRIORITY: Fix scrapers with null dates and missing addresses');
console.log('='.repeat(80));
