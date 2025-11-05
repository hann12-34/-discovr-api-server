const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Don\'t Tell Mama events...');
  const scraper = createUniversalScraper(
    'Don\'t Tell Mama',
    'https://donttellmamanyc.com/',
    '343 W 46th St, New York, NY 10036'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
