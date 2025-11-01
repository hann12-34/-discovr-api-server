const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'Le Poisson Rouge';
const VENUE_ADDRESS = '158 Bleecker St, New York, NY 10012';

async function scrapeEvents(city = 'New York') {
  console.log(`🎪 Scraping ${VENUE_NAME} events...`);
  
  // TODO: Add actual scraping logic for Le Poisson Rouge
  // URL needed for scraping
  console.log('   ⚠️  0 events (scraping logic not yet implemented)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
