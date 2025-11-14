const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Montreal') {
  console.log('🍹 Scraping Datcha Bar events...');
  const scraper = createUniversalScraper(
    'Datcha Bar',
    'https://www.bardatcha.ca/programmation',
    'Montreal'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
