const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Friends Lovers events...');
  const scraper = createUniversalScraper(
    'Friends Lovers',
    'https://www.fnlbk.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
