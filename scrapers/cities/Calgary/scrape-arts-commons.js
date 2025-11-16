const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Calgary') {
  console.log('🎭 Scraping Arts Commons events...');
  const scraper = createUniversalScraper(
    'Arts Commons',
    'https://www.artscommons.ca/whats-on',
    'Calgary'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
