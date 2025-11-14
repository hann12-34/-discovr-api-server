const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Glenn Gould Studio events...');
  const scraper = createUniversalScraper(
    'Glenn Gould Studio',
    'https://www.cbc.ca/glenngouldstudio/events',
    '250 Front St W, Toronto, ON M5V 3G5'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
