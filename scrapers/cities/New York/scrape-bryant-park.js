const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'Bryant Park';
const VENUE_ADDRESS = 'Bryant Park, New York, NY 10018';

async function scrapeEvents(city = 'New York') {
  console.log(`🎪 Scraping ${VENUE_NAME} events...`);
  
  // TODO: Add actual scraping logic for Bryant Park
  // URL needed for scraping
  console.log('   ⚠️  0 events (scraping logic not yet implemented)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
