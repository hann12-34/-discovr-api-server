const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Montreal') {
  console.log('🎪 Scraping Montreal Generator events...');
  const scraper = createUniversalScraper(
    'Montreal Generator',
    'https://www.google.com/search?q=${encodeURIComponent(club.name',
    'Montreal'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
