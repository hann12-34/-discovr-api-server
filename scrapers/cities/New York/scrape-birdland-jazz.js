const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'Birdland Jazz Club';
const VENUE_ADDRESS = '315 W 44th St, New York, NY 10036';

async function scrapeEvents(city = 'New York') {
  console.log(`🎪 Scraping ${VENUE_NAME} events...`);
  
  // TODO: Add actual scraping logic for Birdland Jazz Club
  // URL needed for scraping
  console.log('   ⚠️  0 events (scraping logic not yet implemented)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
