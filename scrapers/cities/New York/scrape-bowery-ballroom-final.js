const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Bowery Ballroom events...');
  const scraper = createUniversalScraper(
    'Bowery Ballroom',
    'https://www.boweryballroom.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
