const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Central Park Summerstage events...');
  const scraper = createUniversalScraper(
    'Central Park Summerstage',
    'https://www.summerstage.org/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
