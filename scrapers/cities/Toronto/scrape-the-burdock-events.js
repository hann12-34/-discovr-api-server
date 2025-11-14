const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping The Burdock events...');
  const scraper = createUniversalScraper(
    'The Burdock',
    'https://www.theburdock.ca',
    '1184 Bloor St W, Toronto, ON M6H 1N2'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
