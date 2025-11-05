const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Montreal') {
  console.log('🎪 Scraping Montreal Theater Generator events...');
  const scraper = createUniversalScraper(
    'Montreal Theater Generator',
    'https://www.google.com/search?q=${encodeURIComponent(theater.name',
    'Montreal'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
