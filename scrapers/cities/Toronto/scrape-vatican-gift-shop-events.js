const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Vatican Gift Shop events...');
  const scraper = createUniversalScraper(
    'Vatican Gift Shop',
    'https://www.vaticangiftshop.ca',
    '69 McCaul St, Toronto, ON M5T 2W7'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
