const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Polson Pier events...');
  const scraper = createUniversalScraper(
    'Polson Pier',
    'https://allevents.in/toronto/',
    '11 Polson St, Toronto, ON M5A 1A4'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
