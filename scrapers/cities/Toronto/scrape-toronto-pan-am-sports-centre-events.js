const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Toronto Pan Am Sports Centre events...');
  const scraper = createUniversalScraper(
    'Toronto Pan Am Sports Centre',
    'https://www.blogto.com/events/',
    '875 Morningside Ave, Scarborough, ON M1C 0C7'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
