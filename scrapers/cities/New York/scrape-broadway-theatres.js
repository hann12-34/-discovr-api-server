const { filterEvents } = require('../../utils/eventFilter');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping NYC events...');
  
  // Returns empty - needs real venue URL research
  // NO aggregator fallbacks per user requirement
  console.log('   ⚠️  0 events (needs real venue URL)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
