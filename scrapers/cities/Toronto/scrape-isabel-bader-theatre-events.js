const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Isabel Bader Theatre events...');
  const scraper = createUniversalScraper(
    'Isabel Bader Theatre',
    'https://nowtoronto.com/music',
    '93 Charles St W, Toronto, ON M5S 1K9'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
