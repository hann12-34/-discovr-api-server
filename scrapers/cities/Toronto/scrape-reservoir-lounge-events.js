const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Reservoir Lounge events...');
  const scraper = createUniversalScraper(
    'Reservoir Lounge',
    'https://www.reservoirlounge.com/events',
    '52 Wellington St E, Toronto, ON M5E 1C7'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
