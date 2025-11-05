const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Upright Citizens Brigade events...');
  const scraper = createUniversalScraper(
    'Upright Citizens Brigade',
    'https://ucbtheatre.com/shows',
    '307 W 26th St, New York, NY 10001'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
