const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'Caroline\'s on Broadway';
const VENUE_ADDRESS = '1626 Broadway, New York, NY 10019';

async function scrapeEvents(city = 'New York') {
  console.log(`🎪 Scraping ${VENUE_NAME} events...`);
  
  // TODO: Add actual scraping logic for Caroline's on Broadway
  // URL needed for scraping
  console.log('   ⚠️  0 events (scraping logic not yet implemented)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
