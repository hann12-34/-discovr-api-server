const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Calgary') {
  console.log('🎪 Scraping Calgary Zoo events...');
  const scraper = createUniversalScraper(
    'Calgary Zoo',
    'https://www.calgaryzoo.com/events/',
    'Calgary'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
