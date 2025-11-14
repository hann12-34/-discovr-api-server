const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping MOCA events...');
  const scraper = createUniversalScraper(
    'MOCA',
    'https://moca.ca/exhibitions',
    '158 Sterling Rd, Toronto, ON M6R 2B2'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
