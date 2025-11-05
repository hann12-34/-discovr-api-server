const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Radio City Music Hall events...');
  const scraper = createUniversalScraper(
    'Radio City Music Hall',
    'https://www.msg.com/radio-city-music-hall',
    '1260 6th Ave, New York, NY 10020'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
