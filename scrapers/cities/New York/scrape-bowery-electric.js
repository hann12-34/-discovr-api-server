const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'Bowery Electric';
const VENUE_ADDRESS = '327 Bowery, New York, NY 10003';

async function scrapeEvents(city = 'New York') {
  console.log(`🎪 Scraping ${VENUE_NAME} events...`);
  
  // TODO: Add actual scraping logic for Bowery Electric
  // URL needed for scraping
  console.log('   ⚠️  0 events (scraping logic not yet implemented)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
