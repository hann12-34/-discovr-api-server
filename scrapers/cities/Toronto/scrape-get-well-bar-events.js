const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Get Well events...');
  const scraper = createUniversalScraper(
    'Get Well',
    'https://www.getwellbar.com/',
    '1181 Dundas St W, Toronto, ON M6J 1X3'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
