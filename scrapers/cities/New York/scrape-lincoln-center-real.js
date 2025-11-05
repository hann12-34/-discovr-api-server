const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Lincoln Center events...');
  const scraper = createUniversalScraper(
    'Lincoln Center',
    'https://www.lincolncenter.org/',
    '10 Lincoln Center Plaza, New York, NY 10023'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
