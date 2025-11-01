const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'Playwrights Horizons';
const VENUE_ADDRESS = '416 W 42nd St, New York, NY 10036';

async function scrapeEvents(city = 'New York') {
  console.log(`🎪 Scraping ${VENUE_NAME} events...`);
  
  // TODO: Add actual scraping logic for Playwrights Horizons
  // URL needed for scraping
  console.log('   ⚠️  0 events (scraping logic not yet implemented)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
