const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Project Gigglewater events...');
  const scraper = createUniversalScraper(
    'Project Gigglewater',
    'https://projectgigglewater.com',
    '68 Clinton St, Toronto, ON M6G 2Y3'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
