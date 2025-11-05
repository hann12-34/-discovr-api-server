const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Gramercy Theatre events...');
  const scraper = createUniversalScraper(
    'Gramercy Theatre',
    'https://www.gramercytheatre.com/events',
    '127 E 23rd St, New York, NY 10010'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
