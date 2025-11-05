const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Feinstein\'s 54 Below events...');
  const scraper = createUniversalScraper(
    'Feinstein\'s 54 Below',
    'https://54below.com/',
    '254 W 54th St, New York, NY 10019'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
