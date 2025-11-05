const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping St Lawrence Centre events...');
  const scraper = createUniversalScraper(
    'St Lawrence Centre',
    'https://nowtoronto.com/music',
    '27 Front St E, Toronto, ON M5E 1B4'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
