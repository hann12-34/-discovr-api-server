const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Superior Ingredients events...');
  const scraper = createUniversalScraper(
    'Superior Ingredients',
    'https://www.superioringredients.nyc/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
