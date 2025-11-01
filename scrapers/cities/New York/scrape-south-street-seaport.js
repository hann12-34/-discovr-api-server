const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'South Street Seaport';
const VENUE_ADDRESS = '19 Fulton St, New York, NY 10038';

async function scrapeEvents(city = 'New York') {
  console.log(`🎪 Scraping ${VENUE_NAME} events...`);
  
  // TODO: Add actual scraping logic for South Street Seaport
  // URL needed for scraping
  console.log('   ⚠️  0 events (scraping logic not yet implemented)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
