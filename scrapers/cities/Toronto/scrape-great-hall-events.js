const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Great Hall events...');
  const scraper = createUniversalScraper(
    'Great Hall',
    'https://www.thegreathall.ca/events',
    '1087 Queen St W, Toronto, ON M6J 1H3'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
