const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Leslieville events...');
  const scraper = createUniversalScraper(
    'Leslieville',
    'https://www.leslievillbia.com/events',
    '1060 Queen St E, Toronto, ON M4M 1K4'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
