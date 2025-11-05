const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Allan Gardens events...');
  const scraper = createUniversalScraper(
    'Allan Gardens',
    'https://www.eventbrite.ca/d/canada--toronto/events--this-weekend/',
    '160 Gerrard St E, Toronto, ON M5A 2E4'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
