const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'Union Pool';
const VENUE_ADDRESS = '484 Union Ave, Brooklyn, NY 11211';

async function scrapeEvents(city = 'New York') {
  console.log(`🎪 Scraping ${VENUE_NAME} events...`);
  
  // TODO: Add actual scraping logic for Union Pool
  // URL needed for scraping
  console.log('   ⚠️  0 events (scraping logic not yet implemented)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
