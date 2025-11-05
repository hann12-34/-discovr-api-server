const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping SOBs events...');
  const scraper = createUniversalScraper(
    'SOBs',
    'https://www.sobs.com/',
    '204 Varick St, New York, NY 10014'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
