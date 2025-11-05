const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Music Hall Williamsburg events...');
  const scraper = createUniversalScraper(
    'Music Hall Williamsburg',
    'https://www.musichallofwilliamsburg.com/events',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
