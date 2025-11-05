const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping South Street Seaport events...');
  const scraper = createUniversalScraper(
    'South Street Seaport',
    'https://southstreetseaportmuseum.org/events',
    '12 Fulton St, New York, NY 10038'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
