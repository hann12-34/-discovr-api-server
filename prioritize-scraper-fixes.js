/**
 * PRIORITIZE SCRAPER FIXES
 * Identify which scrapers are most important to fix based on venue popularity
 */

const fs = require('fs');

// High-priority venues (major concert halls, sports arenas, popular venues)
const highPriorityVenues = [
  // Vancouver
  'rogersArena', 'queenElizabethTheatre', 'rickshawTheatre', 'commodoreBallroom',
  'theCultch', 'theJunction', 'pneEvents', 'granvilleIslandBrewing',
  
  // Montreal  
  'placeDesArts', 'olympiaDeMontrealEvents', 'theatreSaintDenis', 'maisonneuvePark',
  
  // Calgary
  'saddledome', 'scrape-jubilee-auditorium', 'scrape-calgary-zoo',
  
  // Toronto
  'scotiabankArena',
  
  // New York
  'madison-square-garden', 'times-square-nyc'
];

const scrapers = JSON.parse(fs.readFileSync('scrapers-with-null-dates.json', 'utf8'));

console.log('🎯 PRIORITIZING SCRAPER FIXES\n');
console.log('='.repeat(80));

// Categorize by priority
const highPriority = [];
const mediumPriority = [];
const lowPriority = [];

scrapers.forEach(scraper => {
  const fileName = scraper.file.replace('.js', '');
  
  if (highPriorityVenues.includes(fileName)) {
    highPriority.push(scraper);
  } else if (scraper.city === 'Vancouver' || scraper.city === 'Montreal') {
    mediumPriority.push(scraper);
  } else {
    lowPriority.push(scraper);
  }
});

console.log(`\n🔴 HIGH PRIORITY (${highPriority.length}):`);
console.log('Major venues - fix these FIRST!\n');
highPriority.forEach(s => {
  console.log(`   ${s.city}/${s.file}`);
});

console.log(`\n🟡 MEDIUM PRIORITY (${mediumPriority.length}):`);
console.log('Vancouver & Montreal venues\n');
mediumPriority.slice(0, 10).forEach(s => {
  console.log(`   ${s.city}/${s.file}`);
});
if (mediumPriority.length > 10) {
  console.log(`   ... and ${mediumPriority.length - 10} more`);
}

console.log(`\n⚪ LOW PRIORITY (${lowPriority.length}):`);
console.log('Other venues - fix as needed\n');

// Save prioritized list
fs.writeFileSync('scraper-fix-priority.json', JSON.stringify({
  high: highPriority,
  medium: mediumPriority,
  low: lowPriority
}, null, 2));

console.log('\n✅ Saved to scraper-fix-priority.json');
console.log('\nFIX ORDER: High → Medium → Low');
