const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping The Mod Club events...');
  const scraper = createUniversalScraper(
    'The Mod Club',
    'https://www.mirvish.com/',
    '722 College St, Toronto, ON M6G 1C4'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
