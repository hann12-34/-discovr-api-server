const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Calgary') {
  console.log('🎵 Scraping The Hifi Club events...');
  const scraper = createUniversalScraper(
    'The Hifi Club',
    'https://www.thehificlub.ca/events',
    '219 10 Ave SW, Calgary, AB T2R 0A4'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
