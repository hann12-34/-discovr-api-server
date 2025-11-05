const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Northern Secondary School events...');
  const scraper = createUniversalScraper(
    'Northern Secondary School',
    'https://www.blogto.com/events/',
    '851 Mount Pleasant Rd, Toronto, ON M4P 2L4'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
