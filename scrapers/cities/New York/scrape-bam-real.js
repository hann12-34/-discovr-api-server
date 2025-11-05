const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Bam events...');
  const scraper = createUniversalScraper(
    'Bam',
    'https://www.bam.org/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
