const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Elgin Theatre events...');
  const scraper = createUniversalScraper(
    'Elgin Theatre',
    'https://www.blogto.com/arts/',
    '189 Yonge St, Toronto, ON M5B 1M4'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
