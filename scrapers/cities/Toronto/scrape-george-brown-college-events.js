const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping George Brown College events...');
  const scraper = createUniversalScraper(
    'George Brown College',
    'https://www.georgebrown.ca/events',
    '200 King St E, Toronto, ON M5A 3W8'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
