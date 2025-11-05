const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Iridium Jazz events...');
  const scraper = createUniversalScraper(
    'Iridium Jazz',
    'https://theiridium.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
