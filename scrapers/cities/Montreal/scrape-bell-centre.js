const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Montreal') {
  console.log('🏟️  Scraping Bell Centre events...');
  const scraper = createUniversalScraper(
    'Bell Centre',
    'https://www.centrebell.ca/en/calendar',
    'Montreal'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
