const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Union Hall events...');
  const scraper = createUniversalScraper(
    'Union Hall',
    'https://www.unionhallny.com/',
    '702 Union St, Brooklyn, NY 11215'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
