const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎬 Scraping TIFF Bell Lightbox events...');
  const scraper = createUniversalScraper(
    'TIFF Bell Lightbox',
    'https://www.tiff.net/events',
    '350 King St W, Toronto, ON M5V 3X5'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
