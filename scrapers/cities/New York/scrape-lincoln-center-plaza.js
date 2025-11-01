const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'Lincoln Center';
const VENUE_ADDRESS = '10 Lincoln Center Plaza, New York, NY 10023';

async function scrapeEvents(city = 'New York') {
  console.log(`🎪 Scraping ${VENUE_NAME} events...`);
  
  // TODO: Add actual scraping logic for Lincoln Center
  // URL needed for scraping
  console.log('   ⚠️  0 events (scraping logic not yet implemented)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
