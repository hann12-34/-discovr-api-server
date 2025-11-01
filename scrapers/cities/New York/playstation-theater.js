const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'PlayStation Theater';
const VENUE_ADDRESS = '1515 Broadway, New York, NY 10036';

async function scrapeEvents(city = 'New York') {
  console.log(`🎪 Scraping ${VENUE_NAME} events...`);
  
  // TODO: Add actual scraping logic for PlayStation Theater
  // URL needed for scraping
  console.log('   ⚠️  0 events (scraping logic not yet implemented)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
