const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Our Wicked Lady events...');
  const scraper = createUniversalScraper(
    'Our Wicked Lady',
    'https://www.ourwickedlady.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
