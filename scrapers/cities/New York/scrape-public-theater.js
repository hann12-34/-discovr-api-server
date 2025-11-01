const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'The Public Theater';
const VENUE_ADDRESS = '425 Lafayette St, New York, NY 10003';

async function scrapeEvents(city = 'New York') {
  console.log(`🎪 Scraping ${VENUE_NAME} events...`);
  
  // TODO: Add actual scraping logic for The Public Theater
  // URL needed for scraping
  console.log('   ⚠️  0 events (scraping logic not yet implemented)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
