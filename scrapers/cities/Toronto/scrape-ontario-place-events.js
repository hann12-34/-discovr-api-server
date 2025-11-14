const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Ontario Place events...');
  const scraper = createUniversalScraper(
    'Ontario Place',
    'https://www.ontarioplace.com/en/events',
    '955 Lake Shore Blvd W, Toronto, ON M6K 3B9'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
