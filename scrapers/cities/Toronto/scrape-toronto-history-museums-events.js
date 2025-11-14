const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Toronto History Museums events...');
  const scraper = createUniversalScraper(
    'Toronto History Museums',
    'https://www.toronto.ca/explore-enjoy/history-art-culture/museums',
    '260 Adelaide St E, Toronto, ON M5A 1N1'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
