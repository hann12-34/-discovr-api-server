const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Lost and Found events...');
  const scraper = createUniversalScraper(
    'Lost and Found',
    'https://lostandfoundbar.com/',
    '577 King St W, Toronto, ON M5V 1M1'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
