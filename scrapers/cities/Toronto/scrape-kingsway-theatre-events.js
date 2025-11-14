const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Kingsway Theatre events...');
  const scraper = createUniversalScraper(
    'Kingsway Theatre',
    'https://www.kingswaytheatre.com/events',
    '3030 Bloor St W, Etobicoke, ON M8X 1C4'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
