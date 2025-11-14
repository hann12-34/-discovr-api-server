const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Kensington Brewing Company events...');
  const scraper = createUniversalScraper(
    'Kensington Brewing Company',
    'https://kensingtonbrewingcompany.com/events',
    '299 Augusta Ave, Toronto, ON M5T 2M2'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
