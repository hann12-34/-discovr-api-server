const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Berkeley Street Theatre events...');
  const scraper = createUniversalScraper(
    'Berkeley Street Theatre',
    'https://www.canstage.com/shows-events',
    '26 Berkeley St, Toronto, ON M5A 2W3'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
