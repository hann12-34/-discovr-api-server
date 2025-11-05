const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Dancemakers events...');
  const scraper = createUniversalScraper(
    'Dancemakers',
    'https://www.dancemakers.org/performances',
    '927 Dupont St, Toronto, ON M6H 1Z1'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
