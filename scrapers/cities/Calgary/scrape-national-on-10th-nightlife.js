const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Calgary') {
  console.log('🎪 Scraping National on 10th events...');
  const scraper = createUniversalScraper(
    'National on 10th',
    'https://www.instagram.com/nationalon10th/',
    'Calgary'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
