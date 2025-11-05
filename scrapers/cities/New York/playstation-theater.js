const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping PlayStation Theater events...');
  const scraper = createUniversalScraper(
    'PlayStation Theater',
    'https://www.playstationtheater.com',
    '1515 Broadway, New York, NY 10036'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
