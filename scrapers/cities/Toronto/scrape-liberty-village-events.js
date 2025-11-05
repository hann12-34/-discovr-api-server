const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Liberty Village events...');
  const scraper = createUniversalScraper(
    'Liberty Village',
    'https://www.blogto.com/events/',
    '171 E Liberty St, Toronto, ON M6K 3P6'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
