const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Smalls Jazz Club events...');
  const scraper = createUniversalScraper(
    'Smalls Jazz Club',
    'https://www.smallslive.com/',
    '183 W 10th St, New York, NY 10014'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
