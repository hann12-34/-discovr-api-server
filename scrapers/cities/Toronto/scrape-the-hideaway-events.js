const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping The Hideaway events...');
  const scraper = createUniversalScraper(
    'The Hideaway',
    'https://www.ticketweb.ca/search?pl=Toronto',
    '484 Ossington Ave, Toronto, ON M6G 3T5'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
