const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'Chelsea Piers';
const VENUE_ADDRESS = 'Chelsea Piers, New York, NY 10011';

async function scrapeEvents(city = 'New York') {
  console.log(`🎪 Scraping ${VENUE_NAME} events...`);
  
  // TODO: Add actual scraping logic for Chelsea Piers
  // URL needed for scraping
  console.log('   ⚠️  0 events (scraping logic not yet implemented)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
