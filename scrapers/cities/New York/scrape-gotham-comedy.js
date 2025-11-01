const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'Gotham Comedy Club';
const VENUE_ADDRESS = '208 W 23rd St, New York, NY 10011';

async function scrapeEvents(city = 'New York') {
  console.log(`🎪 Scraping ${VENUE_NAME} events...`);
  
  // TODO: Add actual scraping logic for Gotham Comedy Club
  // URL needed for scraping
  console.log('   ⚠️  0 events (scraping logic not yet implemented)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
