const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Justina Barnicke Gallery events...');
  const scraper = createUniversalScraper(
    'Justina Barnicke Gallery',
    'https://artmuseum.utoronto.ca/exhibitions/',
    '7 Hart House Cir, Toronto, ON M5S 3H3'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
