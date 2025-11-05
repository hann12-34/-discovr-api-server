const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping The Cutting Room events...');
  const scraper = createUniversalScraper(
    'The Cutting Room',
    'https://thecuttingroomnyc.com/',
    '44 E 32nd St, New York, NY 10016'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
