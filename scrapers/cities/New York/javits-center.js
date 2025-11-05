const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Javits Center events...');
  const scraper = createUniversalScraper(
    'Javits Center',
    'https://www.javitscenter.com/events/',
    '429 11th Ave, New York, NY 10001'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
