const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Chelsea Piers events...');
  const scraper = createUniversalScraper(
    'Chelsea Piers',
    'https://www.chelseapiers.com/events',
    'Pier 62, New York, NY 10011'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
