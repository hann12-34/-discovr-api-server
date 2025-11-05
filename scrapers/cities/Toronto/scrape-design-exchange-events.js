const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Design Exchange events...');
  const scraper = createUniversalScraper(
    'Design Exchange',
    'https://www.blogto.com/music/',
    '234 Bay St, Toronto, ON M5K 1B2'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
