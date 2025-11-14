const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎵 Scraping Massey Hall events...');
  const scraper = createUniversalScraper(
    'Massey Hall',
    'https://www.masseyhall.com/events',
    '178 Victoria St, Toronto, ON M5B 1T7'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
