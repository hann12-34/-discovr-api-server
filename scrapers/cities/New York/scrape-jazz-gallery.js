const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Jazz Gallery events...');
  const scraper = createUniversalScraper(
    'Jazz Gallery',
    'https://www.jazzgallery.org/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
