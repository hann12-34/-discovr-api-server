const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Steamwhistle Brewing events...');
  const scraper = createUniversalScraper(
    'Steamwhistle Brewing',
    'https://steamwhistle.ca/events',
    '255 Bremner Blvd, Toronto, ON M5V 3M9'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
