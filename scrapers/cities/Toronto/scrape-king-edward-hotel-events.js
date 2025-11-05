const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping King Edward Hotel events...');
  const scraper = createUniversalScraper(
    'King Edward Hotel',
    'https://nowtoronto.com/stage',
    '37 King St E, Toronto, ON M5C 1E9'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
