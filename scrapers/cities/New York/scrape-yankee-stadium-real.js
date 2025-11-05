const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Yankee Stadium events...');
  const scraper = createUniversalScraper(
    'Yankee Stadium',
    'https://www.mlb.com/yankees/tickets',
    '1 E 161st St, Bronx, NY 10451'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
