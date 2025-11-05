const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Trans Pecos events...');
  const scraper = createUniversalScraper(
    'Trans Pecos',
    'https://www.trans-pecos.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
