const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Riis Park Beach events...');
  const scraper = createUniversalScraper(
    'Riis Park Beach',
    'https://www.riisparkbeachbazaar.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
