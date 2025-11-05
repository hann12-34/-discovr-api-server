const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Barclays Center events...');
  const scraper = createUniversalScraper(
    'Barclays Center',
    'https://www.barclayscenter.com/events',
    '620 Atlantic Ave, Brooklyn, NY 11217'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
