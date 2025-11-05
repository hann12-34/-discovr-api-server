const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Broadway Theatres events...');
  const scraper = createUniversalScraper(
    'Broadway Theatres',
    'https://www.broadway.com/shows',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
