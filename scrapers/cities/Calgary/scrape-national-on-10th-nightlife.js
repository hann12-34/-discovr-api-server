const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Calgary') {
  console.log('🍺 Scraping National on 10th events...');
  const scraper = createUniversalScraper(
    'National on 10th',
    'https://www.nationalon10th.com/events',
    '1210 10 St SW, Calgary, AB T2R 1E3'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
