const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Bar Mordecai events...');
  const scraper = createUniversalScraper(
    'Bar Mordecai',
    'https://www.barmordecai.ca',
    '822 College St, Toronto, ON M6G 1C8'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
