const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Pete\'s Candy Store events...');
  const scraper = createUniversalScraper(
    'Pete\'s Candy Store',
    'https://petescandystore.com/',
    '709 Lorimer St, Brooklyn, NY 11211'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
