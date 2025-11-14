const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Second City Toronto Alt events...');
  const scraper = createUniversalScraper(
    'Second City Toronto Alt',
    'https://www.secondcity.com/shows/toronto',
    '51 Mercer St, Toronto, ON M5V 1H2'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
