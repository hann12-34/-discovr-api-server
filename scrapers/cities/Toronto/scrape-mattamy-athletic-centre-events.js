const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Mattamy Athletic Centre events...');
  const scraper = createUniversalScraper(
    'Mattamy Athletic Centre',
    'https://www.blogto.com/events/',
    '50 Carlton St, Toronto, ON M5B 1J2'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
