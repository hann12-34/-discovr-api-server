const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Calgary') {
  console.log('🎪 Scraping Heritage Park events...');
  const scraper = createUniversalScraper(
    'Heritage Park',
    'https://heritagepark.ca/whats-on-now/',
    'Calgary'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
