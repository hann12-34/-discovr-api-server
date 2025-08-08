/**
 * CRITICAL: Test Both Production Endpoints
 * App shows 2948 events, but our deployed endpoint shows 2957
 * Testing if app hits backup server with old data
 */

const axios = require('axios');

async function testBothEndpoints() {
  console.log('🚨 TESTING BOTH PRODUCTION ENDPOINTS...\n');
  console.log('🎯 App shows: 2948 events');
  console.log('🎯 Goal: Find which endpoint serves 2948 events\n');

  const endpoints = [
    { name: 'PRIMARY (Our Deployment)', url: 'https://discovr-proxy-server.onrender.com' },
    { name: 'BACKUP (Suspect)', url: 'https://discovr-server-backup.onrender.com' }
  ];

  for (const endpoint of endpoints) {
    console.log(`🔍 TESTING: ${endpoint.name}`);
    console.log(`🌐 URL: ${endpoint.url}`);
    console.log('=' .repeat(60));

    try {
      const response = await axios.get(`${endpoint.url}/api/v1/venues/events/all`, {
        timeout: 30000
      });

      const totalEvents = response.data.events ? response.data.events.length : 0;
      console.log(`📊 Total events: ${totalEvents}`);

      // Check NYC events
      const nycResponse = await axios.get(`${endpoint.url}/api/v1/venues/events/all?city=New York`, {
        timeout: 30000
      });
      const nycEvents = nycResponse.data.events ? nycResponse.data.events.length : 0;
      console.log(`🗽 NYC events: ${nycEvents}`);

      // Match analysis
      if (totalEvents === 2948) {
        console.log('🎯 MATCH: This endpoint serves the SAME count as the app!');
        console.log('🚨 CRITICAL: App is likely using THIS endpoint');
      } else if (totalEvents === 2957) {
        console.log('✅ EXPECTED: This is our deployed endpoint');
      } else {
        console.log(`❓ UNKNOWN: Unexpected event count: ${totalEvents}`);
      }

      // Sample events to verify data
      if (response.data.events && response.data.events.length > 0) {
        console.log('\n📋 SAMPLE EVENTS:');
        response.data.events.slice(0, 3).forEach((event, i) => {
          console.log(`${i + 1}. "${event.title}"`);
          console.log(`   Venue City: ${event.venue?.city || 'N/A'}`);
          console.log(`   Price: ${event.price || 'N/A'}`);
        });
      }

    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      
      // Try health check
      try {
        const healthResponse = await axios.get(`${endpoint.url}/api/v1/health`, {
          timeout: 5000
        });
        console.log(`💚 Health: ${JSON.stringify(healthResponse.data)}`);
      } catch (healthError) {
        console.log(`💀 Health check failed: ${healthError.message}`);
      }
    }

    console.log('\n' + '=' .repeat(60) + '\n');
  }

  console.log('🎯 CONCLUSION:');
  console.log('If BACKUP endpoint shows 2948 events:');
  console.log('  → App is using backup server (not our deployed fixes)');
  console.log('  → We must deploy fixes to backup server');
  console.log('  → Or update app to use primary server');
  console.log('');
  console.log('🚀 NEXT STEPS:');
  console.log('1. Deploy all fixes to the endpoint the app actually uses');
  console.log('2. Verify app connects to the correct, updated server');
}

testBothEndpoints().catch(console.error);
