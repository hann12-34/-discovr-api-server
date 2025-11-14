const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Concert Hall events...');
  const scraper = createUniversalScraper(
    'Concert Hall',
    'https://www.masseyhall.com/events',
    '888 Yonge St, Toronto, ON M4W 2J2'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
