const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'Yankee Stadium';
const VENUE_ADDRESS = '1 E 161st St, Bronx, NY 10451';

async function scrapeEvents(city = 'New York') {
  console.log(`🎪 Scraping ${VENUE_NAME} events...`);
  
  // TODO: Add actual scraping logic for Yankee Stadium
  // URL needed for scraping
  console.log('   ⚠️  0 events (scraping logic not yet implemented)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
