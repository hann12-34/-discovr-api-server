/**
 * Test script for running scrapers
 * Run with: node scripts/test-scraper.js
 */

const scrapers = require('../scrapers');

async function runTest() {
  console.log('Testing Commodore Ballroom scraper...');
  
  try {
    // Run the scraper
    const results = await scrapers.runScraper('Commodore Ballroom');
    
    console.log(`Found ${results.length} events:`);
    
    // Display results in a structured format
    results.forEach((event, index) => {
      console.log(`\n--- Event ${index + 1} ---`);
      console.log(`Title: ${event.title}`);
      
      if (event.startDate) {
        console.log(`Date: ${event.startDate instanceof Date ? 
          event.startDate.toISOString().split('T')[0] : 
          'Invalid Date'}`);
      } else {
        console.log('Date: Not available');
      }
      
      console.log(`Venue: ${event.venue.name}`);
      console.log(`Source URL: ${event.sourceURL}`);
      console.log(`Category: ${event.type} / ${event.category}`);
    });
    
    // Output JSON for easy copy-paste
    console.log('\n--- JSON OUTPUT ---');
    console.log(JSON.stringify(results.map(event => ({
      title: event.title,
      date: event.startDate ? 
        (event.startDate instanceof Date ? event.startDate.toISOString().split('T')[0] : 'Invalid') : 
        null,
      venue: event.venue.name,
      url: event.sourceURL
    })), null, 2));
    
    console.log('\nScraping test completed successfully!');
  } catch (error) {
    console.error('Error during scraper test:', error);
  }
}

// Run the test
runTest();
