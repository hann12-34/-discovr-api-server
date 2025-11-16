const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Calgary') {
  console.log('🍻 Scraping Last Best Brewing & Distilling events...');
  const scraper = createUniversalScraper(
    'Last Best Brewing & Distilling',
    'https://lastbestbrewing.com/events/',
    'Calgary'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
