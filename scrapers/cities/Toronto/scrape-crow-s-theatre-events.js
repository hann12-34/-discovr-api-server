const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Crows Theatre events...');
  const scraper = createUniversalScraper(
    'Crows Theatre',
    'https://www.thestar.com/entertainment.html',
    '345 Carlaw Ave, Toronto, ON M4M 2T1'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
