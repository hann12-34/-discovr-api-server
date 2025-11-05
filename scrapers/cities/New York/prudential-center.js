const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Prudential Center events...');
  const scraper = createUniversalScraper(
    'Prudential Center',
    'https://www.prucenter.com/events',
    '25 Lafayette St, Newark, NJ 07102'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
