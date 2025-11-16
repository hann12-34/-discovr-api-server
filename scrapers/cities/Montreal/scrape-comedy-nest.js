const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Montreal') {
  console.log('🎭 Scraping The Comedy Nest events...');
  const scraper = createUniversalScraper(
    'The Comedy Nest',
    'https://www.comedynest.com/en/show-schedule',
    'Montreal'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
