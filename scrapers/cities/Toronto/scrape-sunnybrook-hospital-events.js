const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Sunnybrook Hospital events...');
  const scraper = createUniversalScraper(
    'Sunnybrook Hospital',
    'https://sunnybrook.ca',
    '2075 Bayview Ave, Toronto, ON M4N 3M5'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
