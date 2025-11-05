const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping The Music Hall events...');
  const scraper = createUniversalScraper(
    'The Music Hall',
    'https://www.blogto.com/arts/',
    '147 Danforth Ave, Toronto, ON M4K 1N2'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
