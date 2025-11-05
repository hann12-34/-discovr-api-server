const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Bossa Nova Civic events...');
  const scraper = createUniversalScraper(
    'Bossa Nova Civic',
    'https://bossanovacivicclub.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
