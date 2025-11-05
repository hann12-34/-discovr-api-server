const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping ArrayMusic events...');
  const scraper = createUniversalScraper(
    'ArrayMusic',
    'https://www.blogto.com/events/',
    '60 Atlantic Ave Suite 224, Toronto, ON M6K 1X9'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
