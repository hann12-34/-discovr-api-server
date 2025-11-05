const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Knitting Factory events...');
  const scraper = createUniversalScraper(
    'Knitting Factory',
    'https://bk.knittingfactory.com/calendar/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
