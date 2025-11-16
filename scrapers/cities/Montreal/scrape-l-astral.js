const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Montreal') {
  console.log('✨ Scraping L\'Astral events...');
  const scraper = createUniversalScraper(
    'L\'Astral',
    'https://sallelastral.com/en/events',
    'Montreal'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
