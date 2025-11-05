const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Webster Hall events...');
  const scraper = createUniversalScraper(
    'Webster Hall',
    'https://www.websterhall.com/',
    '125 E 11th St, New York, NY 10003'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
