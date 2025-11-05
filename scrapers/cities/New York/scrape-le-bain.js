const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Le Bain events...');
  const scraper = createUniversalScraper(
    'Le Bain',
    'https://www.thestandardhotels.com/new-york/properties/high-line',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
