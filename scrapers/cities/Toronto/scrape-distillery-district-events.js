const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Distillery District events...');
  const scraper = createUniversalScraper(
    'Distillery District',
    'https://www.thedistillerydistrict.com/events',
    '55 Mill St, Toronto, ON M5A 3C4'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
