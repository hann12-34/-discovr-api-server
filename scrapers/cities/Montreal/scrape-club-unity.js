const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Montreal') {
  console.log('🎉 Scraping Club Unity events...');
  const scraper = createUniversalScraper(
    'Club Unity',
    'https://www.clubunitymontreal.com/events',
    'Montreal'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
