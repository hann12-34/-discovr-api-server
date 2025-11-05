const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Ontario Science Centre events...');
  const scraper = createUniversalScraper(
    'Ontario Science Centre',
    'https://nowtoronto.com/music',
    '770 Don Mills Rd, North York, ON M3C 1T3'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
