const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'Jazz Standard';
const VENUE_ADDRESS = '116 E 27th St, New York, NY 10016';

async function scrapeEvents(city = 'New York') {
  console.log(`🎪 Scraping ${VENUE_NAME} events...`);
  
  // TODO: Add actual scraping logic for Jazz Standard
  // URL needed for scraping
  console.log('   ⚠️  0 events (scraping logic not yet implemented)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
