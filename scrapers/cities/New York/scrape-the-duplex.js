const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping The Duplex events...');
  const scraper = createUniversalScraper(
    'The Duplex',
    'https://theduplex.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
