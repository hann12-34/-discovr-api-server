const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Gotham Comedy Club events...');
  const scraper = createUniversalScraper(
    'Gotham Comedy Club',
    'https://gothamcomedyclub.com',
    '208 W 23rd St, New York, NY 10011'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
