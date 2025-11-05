const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping The Stand Comedy Club events...');
  const scraper = createUniversalScraper(
    'The Stand Comedy Club',
    'https://thestandnyc.com/events',
    '116 E 16th St, New York, NY 10003'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
