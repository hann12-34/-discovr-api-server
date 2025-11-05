const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping The Phoenix Concert Theatre events...');
  const scraper = createUniversalScraper(
    'The Phoenix Concert Theatre',
    'https://www.thephoenixconcerttheatre.com/events',
    '410 Sherbourne St, Toronto, ON M4X 1K2'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
