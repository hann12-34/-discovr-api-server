const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Bar Lunatico events...');
  const scraper = createUniversalScraper(
    'Bar Lunatico',
    'https://barlunatico.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
