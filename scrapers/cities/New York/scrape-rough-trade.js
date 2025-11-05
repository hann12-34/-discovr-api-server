const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Rough Trade NYC events...');
  const scraper = createUniversalScraper(
    'Rough Trade NYC',
    'https://www.roughtradenyc.com/events',
    '64 N 9th St, Brooklyn, NY 11249'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
