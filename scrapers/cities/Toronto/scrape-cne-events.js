const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Cne events...');
  const scraper = createUniversalScraper(
    'Cne',
    'https://theex.com/events',
    'Exhibition Place, Toronto, ON M6K 3C3'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
