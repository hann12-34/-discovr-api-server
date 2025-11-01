const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'Rough Trade NYC';
const VENUE_ADDRESS = '64 N 9th St, Brooklyn, NY 11249';

async function scrapeEvents(city = 'New York') {
  console.log(`🎪 Scraping ${VENUE_NAME} events...`);
  
  // TODO: Add actual scraping logic for Rough Trade NYC
  // URL needed for scraping
  console.log('   ⚠️  0 events (scraping logic not yet implemented)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
