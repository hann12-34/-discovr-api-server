const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Rockwood Music Hall events...');
  const scraper = createUniversalScraper(
    'Rockwood Music Hall',
    'https://rockwoodmusichall.com',
    '196 Allen St, New York, NY 10002'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
