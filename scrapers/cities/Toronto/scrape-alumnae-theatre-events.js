const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Alumnae Theatre events...');
  const scraper = createUniversalScraper(
    'Alumnae Theatre',
    'https://www.alumnaetheatre.com/season',
    '70 Berkeley St, Toronto, ON M5A 2W9'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
