const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Calgary') {
  console.log('🎪 Scraping Dickens Pub events...');
  const scraper = createUniversalScraper(
    'Dickens Pub',
    'https://www.dickenspub.ca/events/',
    'Calgary'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
