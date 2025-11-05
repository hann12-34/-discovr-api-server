const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Rebel Nightclub events...');
  const scraper = createUniversalScraper(
    'Rebel Nightclub',
    'https://rebeltoronto.com/events/',
    '11 Polson St, Toronto, ON M5A 1A4'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
