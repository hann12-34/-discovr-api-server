const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping The Owls Club events...');
  const scraper = createUniversalScraper(
    'The Owls Club',
    'https://theowlsclub.com',
    '847A Bloor St W, Toronto, ON M6G 1M1'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
