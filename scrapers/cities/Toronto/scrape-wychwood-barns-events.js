const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Wychwood Barns events...');
  const scraper = createUniversalScraper(
    'Wychwood Barns',
    'https://www.ticketmaster.ca/search?q=toronto&sort=date%2Casc',
    '601 Christie St, Toronto, ON M6G 4C7'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
