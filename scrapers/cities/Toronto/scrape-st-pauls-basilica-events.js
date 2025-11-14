const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping St Pauls Basilica events...');
  const scraper = createUniversalScraper(
    'St Pauls Basilica',
    'https://www.stpaulbasilica.ca',
    '83 Power St, Toronto, ON M5A 3A8'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
