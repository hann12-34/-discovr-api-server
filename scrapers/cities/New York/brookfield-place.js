const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'Brookfield Place';
const VENUE_ADDRESS = '230 Vesey St, New York, NY 10281';

async function scrapeEvents(city = 'New York') {
  console.log(`🎪 Scraping ${VENUE_NAME} events...`);
  
  // TODO: Add actual scraping logic for Brookfield Place
  // URL needed for scraping
  console.log('   ⚠️  0 events (scraping logic not yet implemented)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
