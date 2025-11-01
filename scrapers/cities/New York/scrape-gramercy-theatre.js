const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'Gramercy Theatre';
const VENUE_ADDRESS = '127 E 23rd St, New York, NY 10010';

async function scrapeEvents(city = 'New York') {
  console.log(`🎪 Scraping ${VENUE_NAME} events...`);
  
  // TODO: Add actual scraping logic for Gramercy Theatre
  // URL needed for scraping
  console.log('   ⚠️  0 events (scraping logic not yet implemented)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
