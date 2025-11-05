const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Billy Bishop Airport events...');
  const scraper = createUniversalScraper(
    'Billy Bishop Airport',
    'https://www.blogto.com/events/',
    '2 Eireann Quay, Toronto, ON M5V 1A1'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
