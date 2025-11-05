const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Berlin Nyc events...');
  const scraper = createUniversalScraper(
    'Berlin Nyc',
    'https://www.berlinnyc.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
