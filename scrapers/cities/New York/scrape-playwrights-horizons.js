const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Playwrights Horizons events...');
  const scraper = createUniversalScraper(
    'Playwrights Horizons',
    'https://www.playwrightshorizons.org',
    '416 W 42nd St, New York, NY 10036'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
