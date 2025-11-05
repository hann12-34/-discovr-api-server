const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Videofag events...');
  const scraper = createUniversalScraper(
    'Videofag',
    'https://www.narcity.com/toronto/things-to-do',
    '187 Augusta Ave, Toronto, ON M5T 2L4'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
