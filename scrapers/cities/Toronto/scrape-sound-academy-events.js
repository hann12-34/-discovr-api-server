const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Sound Academy events...');
  const scraper = createUniversalScraper(
    'Sound Academy',
    'https://www.eventbrite.ca/d/canada--toronto/performing-arts/',
    '11 Polson St, Toronto, ON M5A 1A4'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
