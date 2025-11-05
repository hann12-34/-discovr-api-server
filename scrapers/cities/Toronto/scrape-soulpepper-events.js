const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Soulpepper events...');
  const scraper = createUniversalScraper(
    'Soulpepper',
    'https://www.blogto.com/events/',
    '50 Tank House Ln, Toronto, ON M5A 3C4'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
