const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Longboat Hall events...');
  const scraper = createUniversalScraper(
    'Longboat Hall',
    'https://www.longboathall.com',
    '154 Danforth Ave, Toronto, ON M4K 1N1'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
