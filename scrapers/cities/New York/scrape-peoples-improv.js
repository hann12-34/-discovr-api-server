const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Peoples Improv Theater events...');
  const scraper = createUniversalScraper(
    'Peoples Improv Theater',
    'https://thepit-nyc.com/events',
    '123 E 24th St, New York, NY 10010'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
