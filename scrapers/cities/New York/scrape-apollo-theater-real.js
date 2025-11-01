const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'Apollo Theater';
const VENUE_ADDRESS = '253 W 125th St, New York, NY 10027';

async function scrapeEvents(city = 'New York') {
  console.log(`🎪 Scraping ${VENUE_NAME} events...`);
  
  // TODO: Add actual scraping logic for Apollo Theater
  // URL needed for scraping
  console.log('   ⚠️  0 events (scraping logic not yet implemented)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
