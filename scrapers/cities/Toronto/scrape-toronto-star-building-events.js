const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Toronto Star Building events...');
  const scraper = createUniversalScraper(
    'Toronto Star Building',
    'https://www.thestar.com',
    '1 Yonge St, Toronto, ON M5E 1E6'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
