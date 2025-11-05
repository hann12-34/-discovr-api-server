const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Woodbine Racetrack events...');
  const scraper = createUniversalScraper(
    'Woodbine Racetrack',
    'https://woodbine.com/mohawkpark/calendar/',
    '555 Rexdale Blvd, Etobicoke, ON M9W 5L2'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
