require('dotenv').config({ path: '../../.env' });
const NewYorkScrapers = require('./index');

async function testScrapers() {
  console.log('--- Starting test run for New York scrapers ---');
  const nycScrapers = new NewYorkScrapers();
  try {
    const results = await nycScrapers.scrape();
    console.log('--- New York Scraper Test Complete ---');
    console.log(`Successfully scraped ${results.length} total events.`);
  } catch (error) {
    console.error('--- New York Scraper Test Failed ---');
    console.error(error);
  }
}

testScrapers();
