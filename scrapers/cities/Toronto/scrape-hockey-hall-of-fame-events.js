const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Hockey Hall of Fame events...');
  const scraper = createUniversalScraper(
    'Hockey Hall of Fame',
    'https://toronto.citynews.ca/entertainment/',
    '30 Yonge St, Toronto, ON M5E 1X8'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
