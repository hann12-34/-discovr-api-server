const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping New Adventures In Sound Art events...');
  const scraper = createUniversalScraper(
    'New Adventures In Sound Art',
    'https://naisa.ca/events',
    '233 Sterling Rd Unit 404, Toronto, ON M6R 2B2'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
