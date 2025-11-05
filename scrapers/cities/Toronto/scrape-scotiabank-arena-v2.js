const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Art Gallery of Ontario events...');
  const scraper = createUniversalScraper(
    'Art Gallery of Ontario',
    'https://www.blogto.com/events/',
    '317 Dundas St W, Toronto, ON M5T 1G4'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
