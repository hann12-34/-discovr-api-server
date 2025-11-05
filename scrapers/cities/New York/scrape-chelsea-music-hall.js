const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Chelsea Music Hall events...');
  const scraper = createUniversalScraper(
    'Chelsea Music Hall',
    'https://www.chelseamusichall.com/',
    '407 W 15th St, New York, NY 10011'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
