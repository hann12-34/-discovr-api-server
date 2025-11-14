const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping High Park events...');
  const scraper = createUniversalScraper(
    'High Park',
    'https://www.highpark.org/events.htm',
    '1873 Bloor St W, Toronto, ON M6R 2Z3'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
