const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Mod Club Theatre Alt events...');
  const scraper = createUniversalScraper(
    'Mod Club Theatre Alt',
    'https://nowtoronto.com/movies',
    '722 College St, Toronto, ON M6G 1C4'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
