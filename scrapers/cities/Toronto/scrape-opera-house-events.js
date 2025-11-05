const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Opera House events...');
  const scraper = createUniversalScraper(
    'Opera House',
    'https://www.canadianstage.com/',
    '735 Queen St E, Toronto, ON M4M 1H1'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
