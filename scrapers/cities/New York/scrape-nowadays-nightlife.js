const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'Nowadays';
const VENUE_ADDRESS = '56-06 Cooper Ave, Queens, NY 11385';

async function scrapeEvents(city = 'New York') {
  console.log(`🎪 Scraping ${VENUE_NAME} events...`);
  
  // TODO: Add actual scraping logic for Nowadays
  // URL needed for scraping
  console.log('   ⚠️  0 events (scraping logic not yet implemented)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
