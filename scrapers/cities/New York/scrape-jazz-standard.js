const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Jazz Standard events...');
  const scraper = createUniversalScraper(
    'Jazz Standard',
    'https://www.jazzstandard.com',
    '116 E 27th St, New York, NY 10016'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
