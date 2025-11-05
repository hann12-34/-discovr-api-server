const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Stories events...');
  const scraper = createUniversalScraper(
    'Stories',
    'https://ra.co/clubs/33851/events',
    '379 King St W, Toronto, ON M5V 1K1'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
