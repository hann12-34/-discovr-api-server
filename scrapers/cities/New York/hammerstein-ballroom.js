const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Hammerstein Ballroom events...');
  const scraper = createUniversalScraper(
    'Hammerstein Ballroom',
    'https://www.mcstudios.com/hammerstein-ballroom',
    '311 W 34th St, New York, NY 10001'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
