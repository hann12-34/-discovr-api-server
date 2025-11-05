const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Village Vanguard events...');
  const scraper = createUniversalScraper(
    'Village Vanguard',
    'https://villagevanguard.com/',
    '178 7th Ave S, New York, NY 10014'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
