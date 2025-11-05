const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Music Gallery events...');
  const scraper = createUniversalScraper(
    'Music Gallery',
    'https://www.blogto.com/events/',
    '918 Bathurst St, Toronto, ON M5R 3G5'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
