/**
 * Script to test the venue events endpoint
 * Run with: node scripts/test-venue-endpoint.js
 */

const axios = require('axios');

async function testVenueEndpoint() {
  try {
    console.log('Testing venue events endpoint...');
    
    // Make a request to the API
    const response = await axios.get('http://localhost:3000/api/v1/events/venues/Commodore%20Ballroom');
    
    console.log(`Found ${response.data.count} events for Commodore Ballroom`);
    console.log(`Page ${response.data.page} of ${response.data.pages}`);
    
    // Display the first 5 events
    if (response.data.data.length > 0) {
      console.log('\nSample events:');
      response.data.data.slice(0, 5).forEach((event, index) => {
        console.log(`\n--- Event ${index + 1} ---`);
        console.log(`Title: ${event.name}`);
        console.log(`Date: ${new Date(event.startDate).toISOString().split('T')[0]}`);
        console.log(`Venue: ${event.venue.name}`);
        console.log(`Status: ${event.status}`);
        console.log(`Source URL: ${event.sourceURL || 'N/A'}`);
      });
    }
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error testing venue endpoint:', error.response?.data || error.message);
  }
}

// Run the test
testVenueEndpoint();
