const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Montreal') {
  console.log('🏠 Scraping Casa del Popolo events...');
  const scraper = createUniversalScraper(
    'Casa del Popolo',
    'https://www.casadelpopolo.com/events/',
    'Montreal'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
