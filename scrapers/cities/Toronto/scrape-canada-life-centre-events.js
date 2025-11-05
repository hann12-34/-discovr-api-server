const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Canada Life Centre events...');
  const scraper = createUniversalScraper(
    'Canada Life Centre',
    'https://toronto.citynews.ca/entertainment/',
    '100 King St W, Toronto, ON M5X 1C7'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
