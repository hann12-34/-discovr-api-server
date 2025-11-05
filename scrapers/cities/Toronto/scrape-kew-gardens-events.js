const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Kew Gardens events...');
  const scraper = createUniversalScraper(
    'Kew Gardens',
    'https://www.blogto.com/arts/',
    '2075 Queen St E, Toronto, ON M4E 1E3'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
