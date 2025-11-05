const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Toronto Music Garden events...');
  const scraper = createUniversalScraper(
    'Toronto Music Garden',
    'https://toronto.citynews.ca/entertainment/',
    '475 Queens Quay W, Toronto, ON M5V 3A9'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
