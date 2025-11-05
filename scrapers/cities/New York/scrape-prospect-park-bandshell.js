const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Prospect Park Bandshell events...');
  const scraper = createUniversalScraper(
    'Prospect Park Bandshell',
    'https://www.bricartsmedia.org/celebrate-brooklyn',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
