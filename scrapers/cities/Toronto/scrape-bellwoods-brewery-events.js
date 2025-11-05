const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Bellwoods Brewery events...');
  const scraper = createUniversalScraper(
    'Bellwoods Brewery',
    'https://www.blogto.com/events/',
    '124 Ossington Ave, Toronto, ON M6J 2Z5'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
