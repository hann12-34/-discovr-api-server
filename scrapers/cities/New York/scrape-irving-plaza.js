const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'Irving Plaza';
const VENUE_ADDRESS = '17 Irving Pl, New York, NY 10003';

async function scrapeEvents(city = 'New York') {
  console.log(`🎪 Scraping ${VENUE_NAME} events...`);
  
  // TODO: Add actual scraping logic for Irving Plaza
  // URL needed for scraping
  console.log('   ⚠️  0 events (scraping logic not yet implemented)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
