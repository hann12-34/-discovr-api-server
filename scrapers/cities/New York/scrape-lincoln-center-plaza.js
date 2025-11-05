const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Lincoln Center Plaza events...');
  const scraper = createUniversalScraper(
    'Lincoln Center Plaza',
    'https://www.linc olncenter.org/events',
    'Lincoln Center Plaza, New York, NY 10023'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
