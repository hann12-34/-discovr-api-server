const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Avant Gardner events...');
  const scraper = createUniversalScraper(
    'Avant Gardner',
    'https://avantgardner.com/events',
    '140 Stewart Ave, Brooklyn, NY 11237'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
