const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Balzacs Coffee events...');
  const scraper = createUniversalScraper(
    'Balzacs Coffee',
    'https://www.blogto.com/events/',
    'Distillery District, Toronto, ON M5A 3C4'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
