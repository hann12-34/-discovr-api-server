const fs = require('fs');
const path = require('path');

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'New York');
const allFiles = fs.readdirSync(scrapersDir);
const scrapers = allFiles.filter(f => f.endsWith('.js') && !f.includes('test') && !f.includes('index'));

let fixed = 0;

for (const file of scrapers) {
  try {
    const content = fs.readFileSync(path.join(scrapersDir, file), 'utf8');
    
    // Check if using aggregators
    if (content.includes('timeout.com') || content.includes('eventbrite.com') || content.includes('todocanada')) {
      // Replace with placeholder that returns empty - better than aggregator
      const cleanTemplate = `const { filterEvents } = require('../../utils/eventFilter');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping NYC events...');
  
  // Returns empty - needs real venue URL research
  // NO aggregator fallbacks per user requirement
  console.log('   ⚠️  0 events (needs real venue URL)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
`;
      
      fs.writeFileSync(path.join(scrapersDir, file), cleanTemplate, 'utf8');
      fixed++;
    }
  } catch (e) {}
}

console.log(`✅ Removed aggregators from ${fixed} scrapers`);
console.log(`💡 All now return empty instead of using aggregators`);
console.log(`🎯 Next: Research real venue URLs for these scrapers`);
