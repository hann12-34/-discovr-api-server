const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping University Of Toronto events...');
  const scraper = createUniversalScraper(
    'University Of Toronto',
    'https://www.blogto.com/events/',
    '27 King'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
