const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'Avant Gardner';
const VENUE_ADDRESS = '140 Stewart Ave, Brooklyn, NY 11237';

async function scrapeEvents(city = 'New York') {
  console.log(`🎪 Scraping ${VENUE_NAME} events...`);
  
  // TODO: Add actual scraping logic for Avant Gardner
  // URL needed for scraping
  console.log('   ⚠️  0 events (scraping logic not yet implemented)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
