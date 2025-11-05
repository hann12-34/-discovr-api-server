const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Montreal') {
  console.log('🎪 Scraping Theatre St-Denis events...');
  const scraper = createUniversalScraper(
    'Theatre St-Denis',
    'https://www.theatrestdenis.com/en/shows',
    'Montreal'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
