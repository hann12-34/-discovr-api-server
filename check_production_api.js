/**
 * Production API Health Check
 * Diagnoses why app shows old data (2948 events) after deployment (3418 events)
 * Tests production API directly to identify caching/server/database issues
 */

const axios = require('axios');

async function checkProductionAPI() {
  try {
    console.log('🔍 PRODUCTION API HEALTH CHECK...\n');
    console.log('🎯 Expected: 3418 events, 348 NYC events');
    console.log('📱 App sees: 2948 events, 4 NYC events');
    console.log('❓ Goal: Find why production API serves old data\n');

    const baseURL = 'https://discovr-proxy-server.onrender.com';

    // Test 1: Basic connectivity
    console.log('🔧 TEST 1: BASIC CONNECTIVITY');
    console.log('=' .repeat(40));
    
    try {
      const healthResponse = await axios.get(`${baseURL}/api/v1/venues/events/all`, {
        timeout: 10000,
        params: { limit: 1 }
      });
      
      console.log(`✅ API Status: ${healthResponse.status}`);
      console.log(`📊 Response size: ${JSON.stringify(healthResponse.data).length} chars`);
      
      if (healthResponse.data.events) {
        console.log(`📈 Events array length: ${healthResponse.data.events.length}`);
      }
    } catch (error) {
      console.log(`❌ API Error: ${error.message}`);
      return;
    }

    // Test 2: Total event count
    console.log('\n🔧 TEST 2: TOTAL EVENT COUNT');
    console.log('=' .repeat(35));
    
    try {
      const allEventsResponse = await axios.get(`${baseURL}/api/v1/venues/events/all`, {
        timeout: 30000
      });
      
      const totalEvents = allEventsResponse.data.events ? allEventsResponse.data.events.length : 0;
      console.log(`📊 Production API total events: ${totalEvents}`);
      console.log(`📈 Expected events: 3418`);
      console.log(`📱 App sees events: 2948`);
      
      if (totalEvents === 3418) {
        console.log(`✅ SUCCESS: Production API has updated data!`);
      } else if (totalEvents === 2948) {
        console.log(`⚠️ OLD DATA: Production API serves old event count`);
      } else {
        console.log(`❓ UNKNOWN: Production API has unexpected count: ${totalEvents}`);
      }
    } catch (error) {
      console.log(`❌ Total count error: ${error.message}`);
    }

    // Test 3: NYC event count
    console.log('\n🔧 TEST 3: NYC EVENT COUNT');
    console.log('=' .repeat(30));
    
    try {
      const nycResponse = await axios.get(`${baseURL}/api/v1/venues/events/all`, {
        timeout: 30000,
        params: { city: 'New York' }
      });
      
      const nycEvents = nycResponse.data.events ? nycResponse.data.events.length : 0;
      console.log(`🗽 Production API NYC events: ${nycEvents}`);
      console.log(`📈 Expected NYC events: 348`);
      console.log(`📱 App sees NYC events: 4`);
      
      if (nycEvents === 348) {
        console.log(`✅ SUCCESS: Production API has updated NYC data!`);
      } else if (nycEvents === 4) {
        console.log(`⚠️ OLD DATA: Production API serves old NYC count`);
      } else {
        console.log(`❓ UNKNOWN: Production API has unexpected NYC count: ${nycEvents}`);
      }

      // Sample NYC events
      if (nycResponse.data.events && nycResponse.data.events.length > 0) {
        console.log('\n📋 SAMPLE NYC EVENTS FROM PRODUCTION API:');
        nycResponse.data.events.slice(0, 5).forEach((event, i) => {
          console.log(`${i + 1}. "${event.title}"`);
          console.log(`   Venue City: ${event.venue?.city || 'N/A'}`);
          console.log(`   Location: ${event.location || 'N/A'}`);
          console.log('');
        });
      }
    } catch (error) {
      console.log(`❌ NYC count error: ${error.message}`);
    }

    // Test 4: Server timestamp/version
    console.log('\n🔧 TEST 4: SERVER INFO');
    console.log('=' .repeat(25));
    
    try {
      const timestamp = new Date().toISOString();
      console.log(`🕐 Current time: ${timestamp}`);
      
      // Try to get server info if available
      try {
        const infoResponse = await axios.get(`${baseURL}/api/v1/health`, {
          timeout: 5000
        });
        console.log(`📟 Server info: ${JSON.stringify(infoResponse.data)}`);
      } catch (infoError) {
        console.log(`📟 No server info endpoint available`);
      }
    } catch (error) {
      console.log(`❌ Server info error: ${error.message}`);
    }

    // Test 5: Compare sample events
    console.log('\n🔧 TEST 5: DATA FRESHNESS CHECK');
    console.log('=' .repeat(35));
    
    try {
      const sampleResponse = await axios.get(`${baseURL}/api/v1/venues/events/all`, {
        timeout: 10000,
        params: { limit: 10 }
      });
      
      if (sampleResponse.data.events && sampleResponse.data.events.length > 0) {
        console.log('📋 SAMPLE EVENTS FROM PRODUCTION:');
        sampleResponse.data.events.slice(0, 5).forEach((event, i) => {
          console.log(`${i + 1}. "${event.title}"`);
          console.log(`   ID: ${event.id || event._id}`);
          console.log(`   Price: ${event.price || 'N/A'}`);
          console.log(`   Venue City: ${event.venue?.city || 'N/A'}`);
          console.log('');
        });
      }
    } catch (error) {
      console.log(`❌ Sample data error: ${error.message}`);
    }

    console.log('\n🎯 DIAGNOSIS SUMMARY:');
    console.log('=' .repeat(25));
    console.log('If production API shows 3418 events but app shows 2948:');
    console.log('  💡 App may be caching old data');
    console.log('  💡 App may use different endpoint');
    console.log('  💡 Production server needs restart');
    console.log('');
    console.log('If production API shows 2948 events:');
    console.log('  💡 Deployment didn\'t take effect');
    console.log('  💡 Wrong database connected');  
    console.log('  💡 Server code needs update/restart');

  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }
}

// Run the health check
checkProductionAPI().catch(console.error);
