const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'Sleep No More';
const VENUE_ADDRESS = '530 W 27th St, New York, NY 10001';

async function scrapeEvents(city = 'New York') {
  console.log(`🎪 Scraping ${VENUE_NAME} events...`);
  
  // TODO: Add actual scraping logic for Sleep No More
  // URL needed for scraping
  console.log('   ⚠️  0 events (scraping logic not yet implemented)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
