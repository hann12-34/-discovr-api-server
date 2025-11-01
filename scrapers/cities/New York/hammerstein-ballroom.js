const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'Hammerstein Ballroom';
const VENUE_ADDRESS = '311 W 34th St, New York, NY 10001';

async function scrapeEvents(city = 'New York') {
  console.log(`🎪 Scraping ${VENUE_NAME} events...`);
  
  // TODO: Add actual scraping logic for Hammerstein Ballroom
  // URL needed for scraping
  console.log('   ⚠️  0 events (scraping logic not yet implemented)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
