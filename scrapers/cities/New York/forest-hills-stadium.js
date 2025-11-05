const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Forest Hills Stadium events...');
  const scraper = createUniversalScraper(
    'Forest Hills Stadium',
    'https://foresthillsstadium.com/',
    '1 Tennis Pl, Forest Hills, NY 11375'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
