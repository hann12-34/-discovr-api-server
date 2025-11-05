const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Toybox Nightclub events...');
  const scraper = createUniversalScraper(
    'Toybox Nightclub',
    'https://www.toyboxclub.com/events',
    '473 Adelaide St W, Toronto, ON M5V 1T1'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
