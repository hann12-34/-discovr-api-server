const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Woodbine Beach events...');
  const scraper = createUniversalScraper(
    'Woodbine Beach',
    'https://www.toronto.ca/explore-enjoy/parks-gardens-beaches/beaches/woodbine-beach',
    '1675 Lake Shore Blvd E, Toronto, ON M4L 3W6'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
