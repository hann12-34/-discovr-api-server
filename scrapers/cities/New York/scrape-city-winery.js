const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'City Winery';
const VENUE_ADDRESS = '25 11th Ave, New York, NY 10011';

async function scrapeEvents(city = 'New York') {
  console.log(`🎪 Scraping ${VENUE_NAME} events...`);
  
  // TODO: Add actual scraping logic for City Winery
  // URL needed for scraping
  console.log('   ⚠️  0 events (scraping logic not yet implemented)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
