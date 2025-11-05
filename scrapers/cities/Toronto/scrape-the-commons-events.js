const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping The Commons events...');
  const scraper = createUniversalScraper(
    'The Commons',
    'https://nowtoronto.com/movies',
    '281 Broadview Ave, Toronto, ON M4M 2G7'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
