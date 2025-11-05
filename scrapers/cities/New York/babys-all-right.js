const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Baby events...');
  const scraper = createUniversalScraper(
    'Baby',
    'https://www.babysallright.com/',
    '146 Broadway, Brooklyn, NY 11211'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
