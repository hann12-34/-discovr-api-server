/**
 * Test Proxy API Connection
 * 
 * This script tests the connection to your local proxy API and retrieves all events.
 * It compares the number of events from both the cloud API and local proxy API.
 */

const axios = require('axios');

// Add debug logging
console.log(`Testing test-proxy-api.js...`);


// API endpoints
const CLOUD_API_URL = 'https://discovr-api-test-531591199325.northamerica-northeast2.run.app/api/v1/venues/events/all';
const PROXY_API_URL = 'http://localhost:3050/api/v1/venues/events/all';

// HTTP headers to avoid HTTP/3 issues
const HEADERS = {
  'X-Disable-HTTP3': '1.1',
  'X-Force-HTTP-Version': '1.1'
};

// Test both APIs and compare results
async function testApis() {
  console.log('🧪 Testing API connections...\n');
  
  // Test cloud API
  try {
    console.log('🔄 Testing cloud API...');
    const cloudResponse = await axios.get(CLOUD_API_URL, { headers: HEADERS });
    console.log(`✅ Cloud API working! Returned ${cloudResponse.data.length} events`);
  } catch (error) {
    console.error('❌ Cloud API error:', error.message);
  }
  
  // Test proxy API
  try {
    console.log('\n🔄 Testing proxy API...');
    const proxyResponse = await axios.get(PROXY_API_URL);
    console.log(`✅ Proxy API working! Returned ${proxyResponse.data.length} events`);
    
    // Log success message if proxy returned more events
    if (proxyResponse.data.length > 32) {
      console.log(`\n🎉 SUCCESS! Your proxy API returned ${proxyResponse.data.length} events instead of just 32!`);
      console.log('Your app will now have access to all events when using the proxy API.');
    }
  } catch (error) {
    console.error('❌ Proxy API error:', error.message);
    console.log('\n⚠️ Make sure your proxy server is running:');
    console.log('   node proxy-api-server.js');
  }
}

// Run the test
try {
  testApis().catch(console.error);
  console.log('Test completed successfully');
} catch (err) {
  console.error('Test error:', err);
  process.exit(1);
}
