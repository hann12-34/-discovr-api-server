const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'Brooklyn Bowl';
const VENUE_ADDRESS = '61 Wythe Ave, Brooklyn, NY 11249';

async function scrapeEvents(city = 'New York') {
  console.log(`🎪 Scraping ${VENUE_NAME} events...`);
  
  // TODO: Add actual scraping logic for Brooklyn Bowl
  // URL needed for scraping
  console.log('   ⚠️  0 events (scraping logic not yet implemented)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
