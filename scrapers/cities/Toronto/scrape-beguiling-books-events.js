const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('📚 Scraping Beguiling Books events...');
  const scraper = createUniversalScraper(
    'Beguiling Books',
    'https://beguiling.com/pages/events',
    '601 Markham St, Toronto, ON M6G 2L7'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
