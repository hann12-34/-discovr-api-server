const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Blue Note events...');
  const scraper = createUniversalScraper(
    'Blue Note',
    'https://www.bluenote.net/newyork/events',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
