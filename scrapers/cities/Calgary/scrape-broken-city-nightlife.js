const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Calgary') {
  console.log('🎸 Scraping Broken City events...');
  const scraper = createUniversalScraper(
    'Broken City',
    'https://brokencityyyc.com/events',
    '613 11 Ave SW, Calgary, AB T2R 0E1'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
