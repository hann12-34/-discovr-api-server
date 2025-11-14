const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Riverdale Park events...');
  const scraper = createUniversalScraper(
    'Riverdale Park',
    'https://www.toronto.ca/explore-enjoy/parks-gardens-beaches/riverdale-park',
    '550 Broadview Ave, Toronto, ON M4K 2N6'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
