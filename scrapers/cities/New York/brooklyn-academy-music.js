const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Brooklyn Academy Music events...');
  const scraper = createUniversalScraper(
    'Brooklyn Academy Music',
    'https://www.bam.org/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
