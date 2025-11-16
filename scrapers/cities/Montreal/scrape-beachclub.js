const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Montreal') {
  console.log('🌴 Scraping Beachclub events...');
  const scraper = createUniversalScraper(
    'Beachclub',
    'https://www.beachclubmtl.com/programmation',
    'Montreal'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
