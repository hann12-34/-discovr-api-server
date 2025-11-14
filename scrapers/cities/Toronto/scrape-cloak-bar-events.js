const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Cloak Bar events...');
  const scraper = createUniversalScraper(
    'Cloak Bar',
    'https://www.cloakbar.ca',
    '558 College St, Toronto, ON M6G 1B3'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
