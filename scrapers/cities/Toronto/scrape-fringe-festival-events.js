const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Fringe Festival events...');
  const scraper = createUniversalScraper(
    'Fringe Festival',
    'https://nowtoronto.com/movies',
    '180 Shaw St, Toronto, ON M6J 2W5'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
