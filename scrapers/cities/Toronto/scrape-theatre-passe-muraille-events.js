const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Theatre Passe Muraille events...');
  const scraper = createUniversalScraper(
    'Theatre Passe Muraille',
    'https://www.blogto.com/eat_drink/',
    '16 Ryerson Ave, Toronto, ON M5T 2P3'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
