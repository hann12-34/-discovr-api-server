const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Montreal') {
  console.log('🎪 Scraping Montreal Universal Generator events...');
  const scraper = createUniversalScraper(
    'Montreal Universal Generator',
    'https://www.google.com/search?q=${encodeURIComponent(venue.name',
    'Montreal'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
