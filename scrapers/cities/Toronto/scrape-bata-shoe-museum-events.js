const createUniversalScraper = require('./universal-scraper-template');
const { filterGenericPrograms } = require('../../utils/genericProgramFilter');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Bata Shoe Museum events...');
  const scraper = createUniversalScraper(
    'Bata Shoe Museum',
    'https://batashoemuseum.ca/events/',
    '327 Bloor St W, Toronto, ON M5S 1W7'
  );
  
  const events = await scraper(city);
  
  // Filter out generic programs like "PD Days"
  return filterGenericPrograms(events);
}

module.exports = scrapeEvents;
