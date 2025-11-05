const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Silent Barn events...');
  const scraper = createUniversalScraper(
    'Silent Barn',
    'https://silentbarn.org/calendar',
    '603 Bushwick Ave, Brooklyn, NY 11206'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
