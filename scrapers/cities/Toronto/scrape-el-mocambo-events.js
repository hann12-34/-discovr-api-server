const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping El Mocambo events...');
  const scraper = createUniversalScraper(
    'El Mocambo',
    'https://www.blogto.com/music/',
    '464 Spadina Ave, Toronto, ON M5T 2G8'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
