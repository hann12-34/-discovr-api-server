const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Toronto Zoo events...');
  const scraper = createUniversalScraper(
    'Toronto Zoo',
    'https://nowtoronto.com/music',
    '2000 Meadowvale Rd, Scarborough, ON M1B 5K7'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
