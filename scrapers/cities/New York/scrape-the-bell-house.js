const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'The Bell House';
const VENUE_ADDRESS = '149 7th St, Brooklyn, NY 11215';

async function scrapeEvents(city = 'New York') {
  console.log(`🎪 Scraping ${VENUE_NAME} events...`);
  
  // TODO: Add actual scraping logic for The Bell House
  // URL needed for scraping
  console.log('   ⚠️  0 events (scraping logic not yet implemented)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
