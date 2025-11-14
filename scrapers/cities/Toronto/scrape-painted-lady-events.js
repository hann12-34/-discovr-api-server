const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping The Painted Lady events...');
  const scraper = createUniversalScraper(
    'The Painted Lady',
    'https://thepaintedlady.ca',
    '218 Ossington Ave, Toronto, ON M6J 3A1'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
