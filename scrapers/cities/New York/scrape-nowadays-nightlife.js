const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Nowadays events...');
  const scraper = createUniversalScraper(
    'Nowadays',
    'https://nowadays.nyc/events',
    '56-06 Cooper Ave, Queens, NY 11385'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
