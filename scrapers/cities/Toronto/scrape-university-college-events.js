const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping University College events...');
  const scraper = createUniversalScraper(
    'University College',
    'https://www.uc.utoronto.ca/events',
    '15 King'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
