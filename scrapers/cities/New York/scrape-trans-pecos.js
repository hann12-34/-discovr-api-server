const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Trans-Pecos events...');
  const scraper = createUniversalScraper(
    'Trans-Pecos',
    'https://trans-pecos.com',
    '915 Wyckoff Ave, Queens, NY 11385'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
