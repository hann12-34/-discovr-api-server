const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Nest events...');
  const scraper = createUniversalScraper(
    'Nest',
    'https://nesttoronto.com/',
    '423 College St, Toronto, ON M5T 1T1'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
