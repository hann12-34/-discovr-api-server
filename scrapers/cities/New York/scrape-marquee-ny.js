const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Marquee Ny events...');
  const scraper = createUniversalScraper(
    'Marquee Ny',
    'https://marqueeny.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
