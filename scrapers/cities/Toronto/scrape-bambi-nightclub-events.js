const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Bambi events...');
  const scraper = createUniversalScraper(
    'Bambi',
    'https://www.bambitoronto.com/events',
    '1265 Dundas St W, Toronto, ON M6J 1X8'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
