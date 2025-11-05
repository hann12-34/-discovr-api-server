const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping St Vitus Bar events...');
  const scraper = createUniversalScraper(
    'St Vitus Bar',
    'https://saintvitusbar.com/calendar/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
