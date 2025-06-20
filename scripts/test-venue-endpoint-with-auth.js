/**
 * Script to test the venue events endpoint with authentication
 * Run with: node scripts/test-venue-endpoint-with-auth.js
 */

const axios = require('axios');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

// Try to read API key from file if not in env
let apiKey = process.env.API_KEY;
if (!apiKey) {
  try {
    const apiKeyFile = path.join(__dirname, 'api-key.txt');
    if (fs.existsSync(apiKeyFile)) {
      const fileContent = fs.readFileSync(apiKeyFile, 'utf8');
      const match = fileContent.match(/API_KEY=(.+)/);
      if (match && match[1]) {
        apiKey = match[1];
        console.log('API key loaded from file.');
      }
    }
  } catch (err) {
    console.error('Error reading API key file:', err.message);
  }
}

async function testVenueEndpoint() {
  try {
    console.log('Testing venue events endpoint with API key authentication...');
    
    if (!apiKey) {
      throw new Error('No API key found. Please run the create-api-key.js script first.');
    }
    
    console.log('Using API key for authentication.');
    
    // Make a request to the venue endpoint with the API key
    const response = await axios.get('http://localhost:3000/api/v1/events/venues/Commodore%20Ballroom', {
      headers: {
        'x-api-key': apiKey
      }
    });
    
    console.log(`Found ${response.data.count} events for Commodore Ballroom`);
    console.log(`Page ${response.data.page} of ${response.data.pages}`);
    
    // Display the first 5 events with improved fields
    if (response.data.data.length > 0) {
      console.log('\nSample events:');
      response.data.data.slice(0, 5).forEach((event, index) => {
        console.log(`\n--- Event ${index + 1} ---`);
        console.log(`Title: ${event.name}`);
        console.log(`Date: ${new Date(event.startDate).toISOString().split('T')[0]}`);
        console.log(`Venue: ${event.venue.name}`);
        console.log(`Official Website: ${event.venue.website || event.officialWebsite || 'N/A'}`);
        console.log(`Location: ${event.location || (event.venue.city && event.venue.state ? `${event.venue.city}, ${event.venue.state}` : 'Location not available')}`);
        
        // Check if coordinates are available for mapping
        if (event.latitude && event.longitude) {
          console.log(`Coordinates for map: ${event.latitude}, ${event.longitude}`);
        } else if (event.venue.latitude && event.venue.longitude) {
          console.log(`Venue coordinates for map: ${event.venue.latitude}, ${event.venue.longitude}`);
        } else {
          console.log('No coordinates available for mapping');
        }
        
        // Show raw data for debugging
        console.log('Raw location data:');
        console.log(`- event.location: ${event.location || 'undefined'}`);
        console.log(`- event.latitude: ${event.latitude || 'undefined'}`);
        console.log(`- event.longitude: ${event.longitude || 'undefined'}`);
        console.log(`- venue.latitude: ${event.venue.latitude || 'undefined'}`);
        console.log(`- venue.longitude: ${event.venue.longitude || 'undefined'}`);
        
        
        console.log(`Source URL: ${event.sourceURL || 'N/A'}`);
      });
    }
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error testing venue endpoint:', 
      error.response?.data || (error.code === 'ECONNREFUSED' ? 'Connection refused. Is the server running?' : error.message));
  }
}

// Run the test
testVenueEndpoint();
