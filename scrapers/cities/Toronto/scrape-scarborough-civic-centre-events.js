const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Scarborough Civic Centre events...');
  const scraper = createUniversalScraper(
    'Scarborough Civic Centre',
    'https://www.toronto.ca/explore-enjoy/recreation/community-centres',
    '150 Borough Dr, Scarborough, ON M1P 4N7'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
