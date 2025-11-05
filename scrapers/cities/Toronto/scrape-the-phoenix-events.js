const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping The Phoenix events...');
  const scraper = createUniversalScraper(
    'The Phoenix',
    'https://www.thephoenixconcerttheatre.com/events',
    '410 Sherbourne St, Toronto, ON M4X 1K2'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
