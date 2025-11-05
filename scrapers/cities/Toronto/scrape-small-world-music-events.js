const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Small World Music events...');
  const scraper = createUniversalScraper(
    'Small World Music',
    'https://www.narcity.com/toronto/things-to-do',
    '180 Shaw St Suite 305, Toronto, ON M6J 2W5'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
