const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Montreal') {
  console.log('🎸 Scraping Turbo Haüs events...');
  const scraper = createUniversalScraper(
    'Turbo Haüs',
    'https://www.turbohaus.ca/shows',
    'Montreal'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
