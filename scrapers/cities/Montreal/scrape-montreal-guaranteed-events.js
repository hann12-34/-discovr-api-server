const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Montreal') {
  console.log('🎪 Scraping Montreal Guaranteed events...');
  const scraper = createUniversalScraper(
    'Montreal Guaranteed',
    'https://www.google.com/search?q=${encodeURIComponent(venue.name',
    'Montreal'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
