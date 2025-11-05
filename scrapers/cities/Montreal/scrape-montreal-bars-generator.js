const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Montreal') {
  console.log('🎪 Scraping Montreal Bars Generator events...');
  const scraper = createUniversalScraper(
    'Montreal Bars Generator',
    'https://www.google.com/search?q=${encodeURIComponent(bar.name',
    'Montreal'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
