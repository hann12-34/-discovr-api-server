/**
 * Test script for the scraper API endpoint
 * Run with: node scripts/test-scraper-api.js [scraperName]
 * If no scraper name is provided, it will run the Commodore Ballroom scraper
 */

const axios = require('axios');

async function testScraperApi() {
  // Get the scraper name from command-line arguments
  const scraperName = process.argv[2] ? process.argv[2] : 'Commodore Ballroom';
  console.log('Testing scraper API endpoint...');
  
  try {
    // List available scrapers
    const listResponse = await axios.get('http://localhost:3000/api/v1/scrapers');
    console.log('Available scrapers:', listResponse.data);
    
    // Run the specified scraper
    console.log(`\nRunning ${scraperName} scraper...`);
    // Make sure to clearly specify the content-type in the headers
    const runResponse = await axios.post(`http://localhost:3000/api/v1/scrapers/run/${scraperName}`, 
      { save: true }, // Set to true to save events to the database
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    console.log('Request body sent:', { save: true });
    
    console.log(`\nScraper results: Found ${runResponse.data.count} events`);
    
    if (runResponse.data.saveResults) {
      console.log(`Added: ${runResponse.data.saveResults.added}`);
      console.log(`Duplicates: ${runResponse.data.saveResults.duplicates}`);
    }
    
    // Display first 3 events
    console.log('\nSample events:');
    runResponse.data.events.slice(0, 3).forEach((event, index) => {
      console.log(`${index + 1}. ${event.title} - ${event.date}`);
    });
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error during API test:', error.response?.data || error.message);
  }
}

// Run the test
testScraperApi();
