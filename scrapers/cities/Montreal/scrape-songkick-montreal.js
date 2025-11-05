const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Montreal') {
  console.log('🎪 Scraping Songkick Montreal events...');
  const scraper = createUniversalScraper(
    'Songkick Montreal',
    'https://www.songkick.com/metro-areas/27377-canada-montreal',
    'Montreal'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
