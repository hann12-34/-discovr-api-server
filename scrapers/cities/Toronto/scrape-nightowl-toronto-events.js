const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Nightowl Toronto events...');
  const scraper = createUniversalScraper(
    'Nightowl Toronto',
    'https://www.nightowltoronto.com',
    '68 Clinton St, Toronto, ON M6G 2Y3'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
