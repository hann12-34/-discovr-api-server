const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Bowery Ballroom events...');
  const scraper = createUniversalScraper(
    'Bowery Ballroom',
    'https://www.boweryballroom.com/events',
    '6 Delancey St, New York, NY 10002'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
