const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Elsewhere events...');
  const scraper = createUniversalScraper(
    'Elsewhere',
    'https://www.elsewherebrooklyn.com/',
    '599 Johnson Ave, Brooklyn, NY 11237'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
