const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Le Poisson Rouge events...');
  const scraper = createUniversalScraper(
    'Le Poisson Rouge',
    'https://lepoissonrouge.com/events',
    '158 Bleecker St, New York, NY 10012'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
