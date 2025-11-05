const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Velvet Underground events...');
  const scraper = createUniversalScraper(
    'Velvet Underground',
    'https://ra.co/clubs/4476/events',
    '508 Queen St W, Toronto, ON M5V 2B3'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
