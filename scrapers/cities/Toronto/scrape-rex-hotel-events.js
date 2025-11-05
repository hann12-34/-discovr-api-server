const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping The Rex Hotel events...');
  const scraper = createUniversalScraper(
    'The Rex Hotel',
    'https://soulpepper.ca/',
    '194 Queen St W, Toronto, ON M5V 1Z1'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
