const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Irving Plaza events...');
  const scraper = createUniversalScraper(
    'Irving Plaza',
    'https://irvingplaza.com',
    '17 Irving Pl, New York, NY 10003'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
