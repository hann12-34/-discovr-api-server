const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Brooklyn Botanic Garden events...');
  const scraper = createUniversalScraper(
    'Brooklyn Botanic Garden',
    'https://www.bbg.org/calendar',
    '990 Washington Ave, Brooklyn, NY 11225'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
