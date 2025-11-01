const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'Brooklyn Botanic Garden';
const VENUE_ADDRESS = '990 Washington Ave, Brooklyn, NY 11225';

async function scrapeEvents(city = 'New York') {
  console.log(`🎪 Scraping ${VENUE_NAME} events...`);
  
  // TODO: Add actual scraping logic for Brooklyn Botanic Garden
  // URL needed for scraping
  console.log('   ⚠️  0 events (scraping logic not yet implemented)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
