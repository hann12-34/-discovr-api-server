const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Union Sound Company events...');
  const scraper = createUniversalScraper(
    'Union Sound Company',
    'https://unionsoundcompany.com',
    '15 Soudan Ave, Toronto, ON M4S 1V5'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
