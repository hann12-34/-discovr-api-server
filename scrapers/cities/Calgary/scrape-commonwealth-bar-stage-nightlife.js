const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Calgary') {
  console.log('🎪 Scraping Commonwealth Bar & Stage events...');
  const scraper = createUniversalScraper(
    'Commonwealth Bar & Stage',
    'https://www.thecommonwealth.ca/events',
    'Calgary'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
