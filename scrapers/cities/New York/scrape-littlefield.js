const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Littlefield events...');
  const scraper = createUniversalScraper(
    'Littlefield',
    'https://littlefieldnyc.com/',
    '635 Sackett St, Brooklyn, NY 11217'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
