const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping North York Central Library events...');
  const scraper = createUniversalScraper(
    'North York Central Library',
    'https://www.torontopubliclibrary.ca/north-york-central-library',
    '5120 Yonge St, North York, ON M2N 5N9'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
