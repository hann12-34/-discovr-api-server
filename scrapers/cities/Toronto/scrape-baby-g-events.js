const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Baby G events...');
  const scraper = createUniversalScraper(
    'Baby G',
    'https://www.babyg.ca',
    '1520 Queen St W, Toronto, ON M6R 1A4'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
