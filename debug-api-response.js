/**
 * Debug API Response
 * 
 * This script analyzes the full API response to determine:
 * 1. Why only 32 events are showing in the app
 * 2. What filters or pagination might be applied
 */

const axios = require('axios');

// Cloud API base URL
const CLOUD_API_URL = 'https://discovr-api-test-531591199325.northamerica-northeast2.run.app/api/v1';

// Function to analyze the API response
async function analyzeApiResponse() {
  console.log('🔍 Analyzing API response from cloud...');
  
  try {
    // Add HTTP/1.1 headers since your app logs show HTTP/3 issues
    const headers = {
      'X-Disable-HTTP3': '1.1',
      'X-Force-HTTP-Version': '1.1'
    };
    
    // Fetch events from API
    console.log(`🌐 Fetching events from ${CLOUD_API_URL}/venues/events/all`);
    const response = await axios.get(`${CLOUD_API_URL}/venues/events/all`, { headers });
    
    // Check response status
    console.log(`📊 Response status: ${response.status}`);
    console.log(`📊 Content type: ${response.headers['content-type']}`);
    console.log(`📊 Response size: ${JSON.stringify(response.data).length} bytes`);
    
    // Analyze events array
    const events = response.data;
    console.log(`📊 Total events returned by API: ${events.length}`);
    
    if (events.length === 0) {
      console.log('❌ No events returned by API');
      return;
    }
    
    // Sample first event
    console.log('\n📋 Sample event data:');
    const sampleEvent = events[0];
    console.log(JSON.stringify(sampleEvent, null, 2).substring(0, 500) + '...');
    
    // Analyze dates
    const now = new Date();
    const pastEvents = events.filter(e => new Date(e.startDate) < now);
    const futureEvents = events.filter(e => new Date(e.startDate) >= now);
    
    console.log(`\n📅 Date analysis:`);
    console.log(`• Current date: ${now.toISOString()}`);
    console.log(`• Past events: ${pastEvents.length}`);
    console.log(`• Future events: ${futureEvents.length}`);
    
    // Check for earliest and latest events
    if (events.length > 0) {
      const dates = events.map(e => new Date(e.startDate));
      const earliestDate = new Date(Math.min(...dates));
      const latestDate = new Date(Math.max(...dates));
      
      console.log(`• Earliest event date: ${earliestDate.toISOString()}`);
      console.log(`• Latest event date: ${latestDate.toISOString()}`);
    }
    
    // Analyze venues
    const venueNames = [...new Set(events.map(e => e.venue?.name).filter(Boolean))];
    console.log(`\n🏢 Venues (${venueNames.length}):`);
    venueNames.forEach(name => console.log(`• ${name}`));
    
    // Analyze categories
    const categories = [...new Set(events.map(e => e.category).filter(Boolean))];
    console.log(`\n🏷️ Categories (${categories.length}):`);
    categories.forEach(cat => console.log(`• ${cat}`));
    
    // Check for pagination parameters
    console.log('\n📄 Pagination analysis:');
    const headers_keys = Object.keys(response.headers);
    const pagination_headers = headers_keys.filter(k => 
      k.toLowerCase().includes('page') || 
      k.toLowerCase().includes('limit') ||
      k.toLowerCase().includes('total') ||
      k.toLowerCase().includes('count')
    );
    
    if (pagination_headers.length > 0) {
      console.log('Pagination headers found:');
      pagination_headers.forEach(header => {
        console.log(`• ${header}: ${response.headers[header]}`);
      });
    } else {
      console.log('No pagination headers found');
    }
    
    // Check for apparent limit of exactly 32 events
    if (events.length === 32) {
      console.log('\n⚠️ API seems to be returning exactly 32 events, which suggests a hard limit');
      console.log('Try making a request with a limit parameter to check if more events can be retrieved');
    }
    
    // Check if there are query parameters accepted
    console.log('\n🔍 Testing for query parameters...');
    
    // Test with a limit parameter
    try {
      const limitResponse = await axios.get(`${CLOUD_API_URL}/venues/events/all?limit=100`, { headers });
      console.log(`• limit=100 parameter: ${limitResponse.data.length} events returned`);
    } catch (error) {
      console.log(`• limit parameter test failed: ${error.message}`);
    }
    
    // Test with a page parameter
    try {
      const pageResponse = await axios.get(`${CLOUD_API_URL}/venues/events/all?page=2`, { headers });
      console.log(`• page=2 parameter: ${pageResponse.data.length} events returned`);
    } catch (error) {
      console.log(`• page parameter test failed: ${error.message}`);
    }
    
    // Test with a dateFrom parameter
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    try {
      const dateResponse = await axios.get(
        `${CLOUD_API_URL}/venues/events/all?dateFrom=${oneMonthAgo.toISOString()}`, 
        { headers }
      );
      console.log(`• dateFrom parameter: ${dateResponse.data.length} events returned`);
    } catch (error) {
      console.log(`• dateFrom parameter test failed: ${error.message}`);
    }
    
    console.log('\n✅ Analysis complete');
    
  } catch (error) {
    console.error('❌ Error analyzing API response:', error.message);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log('Response data:', error.response.data);
    }
  }
}

// Run the analysis
analyzeApiResponse().catch(console.error);
