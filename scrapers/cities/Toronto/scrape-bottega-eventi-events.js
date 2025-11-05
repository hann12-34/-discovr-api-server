const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Bottega Eventi events...');
  const scraper = createUniversalScraper(
    'Bottega Eventi',
    'https://www.bottegaeventi.com/',
    '55 Mill St Building 63, Toronto, ON M5A 3C4'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
