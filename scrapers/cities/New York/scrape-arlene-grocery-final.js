const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Arlene events...');
  const scraper = createUniversalScraper(
    'Arlene',
    'https://arlenesgrocery.net/',
    '95 Stanton St, New York, NY 10002'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
