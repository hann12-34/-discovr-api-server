const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Birdland Jazz Club events...');
  const scraper = createUniversalScraper(
    'Birdland Jazz Club',
    'https://www.birdlandjazz.com/events',
    '315 W 44th St, New York, NY 10036'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
