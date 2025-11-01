const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'Peoples Improv Theater';
const VENUE_ADDRESS = '123 E 24th St, New York, NY 10010';

async function scrapeEvents(city = 'New York') {
  console.log(`🎪 Scraping ${VENUE_NAME} events...`);
  
  // TODO: Add actual scraping logic for Peoples Improv Theater
  // URL needed for scraping
  console.log('   ⚠️  0 events (scraping logic not yet implemented)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
