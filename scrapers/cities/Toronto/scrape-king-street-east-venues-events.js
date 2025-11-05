const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping King Street East Venues events...');
  const scraper = createUniversalScraper(
    'King Street East Venues',
    'https://www.blogto.com/events/',
    '158 King St E, Toronto, ON M5C 1G6'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
