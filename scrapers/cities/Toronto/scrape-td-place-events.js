const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Td Place events...');
  const scraper = createUniversalScraper(
    'Td Place',
    'https://tdplace.ca/events',
    '1001 Queens Quay W, Toronto, ON M6J 3B2'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
