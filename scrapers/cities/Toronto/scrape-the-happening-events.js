const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping The Happening events...');
  const scraper = createUniversalScraper(
    'The Happening',
    'https://nowtoronto.com/movies',
    '3 Brock Ave, Toronto, ON M6K 2K8'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
