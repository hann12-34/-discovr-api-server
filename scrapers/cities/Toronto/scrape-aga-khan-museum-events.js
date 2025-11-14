const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Aga Khan Museum events...');
  const scraper = createUniversalScraper(
    'Aga Khan Museum',
    'https://agakhanmuseum.org/whats-on/',
    '77 Wynford Dr, Toronto, ON M3C 1K1'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
