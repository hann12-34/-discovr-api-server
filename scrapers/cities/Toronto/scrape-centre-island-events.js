const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Centre Island events...');
  const scraper = createUniversalScraper(
    'Centre Island',
    'https://www.utoronto.ca/events',
    'Toronto Islands, Toronto, ON'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
