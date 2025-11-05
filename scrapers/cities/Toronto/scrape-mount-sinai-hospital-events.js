const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Mount Sinai Hospital events...');
  const scraper = createUniversalScraper(
    'Mount Sinai Hospital',
    'https://www.sinaihealth.ca/events/',
    '600 University Ave, Toronto, ON M5G 1X5'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
