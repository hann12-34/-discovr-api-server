const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping The Danforth events...');
  const scraper = createUniversalScraper(
    'The Danforth',
    'https://www.blogto.com/events/',
    '147 Danforth Ave, Toronto, ON M4K 1N2'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
