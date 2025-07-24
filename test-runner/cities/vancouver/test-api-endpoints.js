/**
 * Test API endpoints to find the correct one for posting events
 */

const axios = require('axios');

// Add debug logging
console.log(`Testing test-api-endpoints.js...`);


// Cloud API base URL
const API_BASE_URL = 'https://discovr-api-test-531591199325.northamerica-northeast2.run.app/api/v1';

// Test event data
const testEvent = {
  title: "API Test Event",
  description: "This is a test event to check API endpoints",
  startDate: new Date(),
  endDate: new Date(),
  venue: {
    name: "Test Venue",
    location: { 
      address: "123 Test St", 
      city: "Vancouver", 
      province: "BC", 
      country: "Canada" 
    }
  },
  category: "Test",
  image: "",
  sourceURL: "https://test.com",
  officialWebsite: "https://test.com",
  ticketURL: "https://test.com/tickets"
};

// Array of endpoints to try
const endpoints = [
  `/events`,
  `/venues/events`,
  `/venues/events/create`,
  `/venue/events`,
  `/venue/event`
];

async function testEndpoints() {
  console.log('🧪 Testing API endpoints to find the correct one...');
  
  // First test if we can connect to the API
  try {
    const response = await axios.get(`${API_BASE_URL}/venues/events/all`);
    console.log(`✅ Successfully connected to API. Found ${response.data.length} events.`);
    console.log(`Sample event title: ${response.data[0].title}`);
  } catch (error) {
    console.error('❌ Could not connect to API:', error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
    }
    return;
  }
  
  // Try each endpoint to see if any accept POST requests
  for (const endpoint of endpoints) {
    console.log(`\n🔍 Testing endpoint: ${endpoint}`);
    try {
      const response = await axios.post(`${API_BASE_URL}${endpoint}`, testEvent);
      console.log(`✅ SUCCESS! Endpoint ${endpoint} accepted POST request`);
      console.log(`Response status: ${response.status}`);
      console.log(`Response data: ${JSON.stringify(response.data)}`);
    } catch (error) {
      console.log(`❌ Failed for endpoint ${endpoint}:`);
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        if (error.response.data) {
          console.log(`Message: ${JSON.stringify(error.response.data).substring(0, 200)}...`);
        }
      } else {
        console.log(`Error: ${error.message}`);
      }
    }
  }
}

// Run the test
try {
  testEndpoints().catch(console.error);
  console.log('Test completed successfully');
} catch (err) {
  console.error('Test error:', err);
  process.exit(1);
}
