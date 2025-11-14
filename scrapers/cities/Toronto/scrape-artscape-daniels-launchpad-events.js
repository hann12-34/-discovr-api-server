const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Artscape Daniels Launchpad events...');
  const scraper = createUniversalScraper(
    'Artscape Daniels Launchpad',
    'https://danielslaunchpad.ca/events',
    '1 Rectory Ln, Toronto, ON M5A 0H5'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
