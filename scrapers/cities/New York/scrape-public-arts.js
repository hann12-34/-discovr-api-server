const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Public Arts events...');
  const scraper = createUniversalScraper(
    'Public Arts',
    'https://publicarts.nyc/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
