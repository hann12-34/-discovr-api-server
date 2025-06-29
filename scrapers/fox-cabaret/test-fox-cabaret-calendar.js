require('dotenv').config();
const FoxCabaretScraper = require('./scrapers/cities/vancouver/foxCabaret');
const vancouverScrapers = require('./scrapers/cities/vancouver');

// The Vancouver scrapers is already an instance

console.log('🦊 Testing Fox Cabaret calendar scraper...');

// Get Fox Cabaret scraper instance
const foxScraper = vancouverScrapers.scrapers.find(s => s.name === 'Fox Cabaret');

if (!foxScraper) {
  console.error('Fox Cabaret scraper not found!');
  process.exit(1);
}

async function testFoxCabaretCalendarScraper() {
  try {
    // Test Axios/Cheerio method
    console.log('Testing Axios/Cheerio method...');
    const cheerioEvents = await foxScraper.scrapeWithAxiosCheerio();
    console.log(`Axios/Cheerio found ${cheerioEvents.length} events`);
    
    if (cheerioEvents.length > 0) {
      console.log('\n✅ First 3 events from Axios/Cheerio:');
      cheerioEvents.slice(0, 3).forEach((event, i) => {
        console.log(`\n--- Event ${i + 1} ---`);
        console.log(`Title: ${event.title}`);
        console.log(`Date: ${new Date(event.date).toLocaleString()}`);
        console.log(`Category: ${event.category}`);
      });
    }
    
    // Test Puppeteer method
    console.log('\nTesting Puppeteer method...');
    const puppeteerEvents = await foxScraper.scrapeWithPuppeteer();
    console.log(`Puppeteer found ${puppeteerEvents.length} events`);
    
    if (puppeteerEvents.length > 0) {
      console.log('\n✅ First 3 events from Puppeteer:');
      puppeteerEvents.slice(0, 3).forEach((event, i) => {
        console.log(`\n--- Event ${i + 1} ---`);
        console.log(`Title: ${event.title}`);
        console.log(`Date: ${new Date(event.date).toLocaleString()}`);
        console.log(`Category: ${event.category}`);
      });
    }
    
    // Test full scraper
    console.log('\nTesting full scraper (with fallback)...');
    const foxEvents = await foxScraper.scrape();
    console.log(`Full scraper returned ${foxEvents.length} events`);
    
    console.log('\n✅ First 5 events from full scraper:');
    foxEvents.slice(0, 5).forEach((event, i) => {
      console.log(`\n--- Event ${i + 1} ---`);
      console.log(`Title: ${event.title}`);
      console.log(`Date: ${new Date(event.date).toLocaleString()}`);
      console.log(`Category: ${event.category}`);
      console.log(`Image URL: ${event.image?.substring(0, 60)}...`);
    });
    
  } catch (error) {
    console.error('Error testing Fox Cabaret scraper:', error);
  }
}

testFoxCabaretCalendarScraper();
