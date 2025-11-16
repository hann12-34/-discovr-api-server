const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Calgary') {
  console.log('🎵 Scraping National Music Centre events...');
  const scraper = createUniversalScraper(
    'National Music Centre (Studio Bell)',
    'https://www.nmc.ca/whats-on/',
    'Calgary'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
