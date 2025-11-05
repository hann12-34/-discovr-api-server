const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping The Bell House events...');
  const scraper = createUniversalScraper(
    'The Bell House',
    'https://www.thebellhouseny.com/events.html',
    '149 7th St, Brooklyn, NY 11215'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
