const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Handlebar events...');
  const scraper = createUniversalScraper(
    'Handlebar',
    'https://www.handlebarmusic.com',
    '159 Augusta Ave, Toronto, ON M5T 2L4'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
