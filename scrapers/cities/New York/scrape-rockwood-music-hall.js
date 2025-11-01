const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'Rockwood Music Hall';
const VENUE_ADDRESS = '196 Allen St, New York, NY 10002';

async function scrapeEvents(city = 'New York') {
  console.log(`🎪 Scraping ${VENUE_NAME} events...`);
  
  // TODO: Add actual scraping logic for Rockwood Music Hall
  // URL needed for scraping
  console.log('   ⚠️  0 events (scraping logic not yet implemented)');
  
  return filterEvents([]);
}

module.exports = scrapeEvents;
