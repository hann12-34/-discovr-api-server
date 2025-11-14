const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Hart House Theatre events...');
  const scraper = createUniversalScraper(
    'Hart House Theatre',
    'https://harthouse.ca/hart-house-theatre',
    '7 Hart House Cir, Toronto, ON M5S 3H3'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
