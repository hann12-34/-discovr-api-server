const createUniversalScraper = require('./universal-scraper-template');
const { filterGenericPrograms } = require('../../utils/genericProgramFilter');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Four Seasons Centre events...');
  const scraper = createUniversalScraper(
    'Four Seasons Centre',
    'https://www.coc.ca/',
    '145 Queen St W, Toronto, ON M5H 4G1'
  );
  
  const events = await scraper(city);
  
  // Filter out generic programs like "25/26 Season"
  return filterGenericPrograms(events);
}

module.exports = scrapeEvents;
