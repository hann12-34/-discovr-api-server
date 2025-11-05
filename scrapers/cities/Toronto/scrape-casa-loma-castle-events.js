const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Casa Loma Castle events...');
  const scraper = createUniversalScraper(
    'Casa Loma Castle',
    'https://casaloma.ca/visit/',
    '1 Austin Terrace, Toronto, ON M5R 1X8'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
