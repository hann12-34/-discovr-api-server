const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Beguiling Books events...');
  const scraper = createUniversalScraper(
    'Beguiling Books',
    'https://www.songkick.com/metro-areas/27539-canada-toronto/calendar',
    '601 Markham St, Toronto, ON M6G 2L7'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
