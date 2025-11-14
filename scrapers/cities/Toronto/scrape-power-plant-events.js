const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Power Plant events...');
  const scraper = createUniversalScraper(
    'Power Plant',
    'https://thepowerplant.org/Exhibitions/Current.aspx',
    '231 Queens Quay W, Toronto, ON M5J 2G8'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
