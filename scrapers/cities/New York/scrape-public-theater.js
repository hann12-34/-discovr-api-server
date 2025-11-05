const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping The Public Theater events...');
  const scraper = createUniversalScraper(
    'The Public Theater',
    'https://publictheater.org/productions',
    '425 Lafayette St, New York, NY 10003'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
