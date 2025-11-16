const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Montreal') {
  console.log('🎸 Scraping Metropolis events...');
  const scraper = createUniversalScraper(
    'Metropolis',
    'https://www.admission.com/venue/metropolis',
    'Montreal'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
