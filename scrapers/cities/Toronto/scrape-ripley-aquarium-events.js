const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Ripleys Aquarium events...');
  const scraper = createUniversalScraper(
    'Ripleys Aquarium',
    'https://www.ripleyaquariums.com/canada/events',
    '288 Bremner Blvd, Toronto, ON M5V 3L9'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
