const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Joe\'s Pub events...');
  const scraper = createUniversalScraper(
    'Joe\'s Pub',
    'https://publictheater.org/programs/joes-pub',
    '425 Lafayette St, New York, NY 10003'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
