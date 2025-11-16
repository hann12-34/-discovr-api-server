const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Calgary') {
  console.log('🏟️  Scraping Saddledome events...');
  const scraper = createUniversalScraper(
    'Scotiabank Saddledome',
    'https://www.scotiabanksaddledome.com/events',
    'Calgary'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
