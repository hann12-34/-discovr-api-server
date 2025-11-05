const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Ontario Legislature events...');
  const scraper = createUniversalScraper(
    'Ontario Legislature',
    'https://toronto.citynews.ca/entertainment/',
    '111 Wellesley St W, Toronto, ON M7A 1A2'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
