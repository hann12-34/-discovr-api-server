const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Pete\ events...');
  const scraper = createUniversalScraper(
    'Pete\',
    'https://petescandystore.com/',
    '709 Lorimer St, Brooklyn, NY 11211'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
