const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Msg events...');
  const scraper = createUniversalScraper(
    'Msg',
    'https://www.msg.com/calendar',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
