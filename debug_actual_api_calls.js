/**
 * DEBUG ACTUAL API CALLS FROM APP
 * Instead of assuming how the app filters, let's see what it actually requests
 * This will reveal the real API call pattern and parameters
 */

const axios = require('axios');

async function debugActualAPICalls() {
  try {
    console.log('🔍 DEBUGGING ACTUAL API CALL PATTERNS...\n');
    console.log('🎯 Goal: Test different API call patterns to match app behavior');
    console.log('📱 App shows: 4 NYC events from 3429 total\n');

    const baseURL = 'https://discovr-proxy-server.onrender.com/api/v1/venues/events/all';

    // Test different API call patterns
    const testCalls = [
      { name: 'NO PARAMETERS', url: baseURL },
      { name: 'CITY=New York', url: `${baseURL}?city=New York` },
      { name: 'CITY=new york', url: `${baseURL}?city=new york` },
      { name: 'CITY=NYC', url: `${baseURL}?city=NYC` },
      { name: 'CITY=NewYork', url: `${baseURL}?city=NewYork` },
      { name: 'LOCATION FILTER', url: `${baseURL}?location=New York` },
      { name: 'VENUE FILTER', url: `${baseURL}?venue=New York` },
    ];

    console.log('🧪 TESTING API CALL PATTERNS:');
    console.log('=' .repeat(50));

    for (const test of testCalls) {
      try {
        console.log(`\n🔍 Testing: ${test.name}`);
        console.log(`🌐 URL: ${test.url}`);

        const response = await axios.get(test.url, { timeout: 10000 });
        const eventCount = response.data.events ? response.data.events.length : 0;
        
        console.log(`📊 Events returned: ${eventCount}`);
        
        if (eventCount === 4) {
          console.log('🎯 EXACT MATCH! This API call returns same count as app!');
          console.log('🚨 CRITICAL: App likely uses THIS exact pattern');
          
          // Analyze the events to understand the pattern
          if (response.data.events && response.data.events.length > 0) {
            console.log('\n📋 MATCHED EVENTS:');
            response.data.events.forEach((event, i) => {
              console.log(`${i + 1}. "${event.title}"`);
              console.log(`   Venue City: ${event.venue?.city || 'N/A'}`);
              console.log(`   Location: ${event.location || 'N/A'}`);
              console.log(`   Venue Name: ${event.venue?.name || 'N/A'}`);
              console.log('');
            });
          }
        } else if (eventCount === 3429) {
          console.log('✅ NO FILTER: Returns all events (same as app total)');
        } else if (eventCount > 100) {
          console.log('📈 LARGE SET: Significant filtering applied');
        } else if (eventCount > 4) {
          console.log('📊 MEDIUM SET: Some filtering applied');
        } else {
          console.log('📉 SMALL SET: Heavy filtering applied');
        }

      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    }

    console.log('\n🎯 ADDITIONAL TESTS - SERVER-SIDE FILTERING:');
    console.log('=' .repeat(50));

    // Test if there's additional server-side filtering we're not seeing
    try {
      console.log('\n🔍 Testing: Raw NYC events from database vs API');
      
      const allEventsResponse = await axios.get(baseURL, { timeout: 30000 });
      const allEvents = allEventsResponse.data.events || [];
      
      // Count events that should match "New York" in various ways
      let locationMatches = 0;
      let venueCityMatches = 0;
      let venueNameMatches = 0;
      let titleMatches = 0;
      
      for (const event of allEvents) {
        const location = (event.location || '').toLowerCase();
        const venueCity = (event.venue?.city || '').toLowerCase();
        const venueName = (event.venue?.name || '').toLowerCase();
        const title = (event.title || '').toLowerCase();
        
        if (location.includes('new york')) locationMatches++;
        if (venueCity.includes('new york')) venueCityMatches++;
        if (venueName.includes('new york')) venueNameMatches++;
        if (title.includes('new york')) titleMatches++;
      }
      
      console.log(`📍 Events with "New York" in location: ${locationMatches}`);
      console.log(`🏢 Events with "New York" in venue.city: ${venueCityMatches}`);
      console.log(`🏟️ Events with "New York" in venue.name: ${venueNameMatches}`);
      console.log(`📝 Events with "New York" in title: ${titleMatches}`);
      
      console.log('\n🎯 ANALYSIS:');
      if (venueCityMatches === 4) {
        console.log('🚨 CRITICAL: Only 4 events in API have venue.city = "New York"');
        console.log('💡 This means our database repair didn\'t propagate to API');
        console.log('🔧 API is serving cached/old data despite database updates');
      } else if (venueCityMatches > 300) {
        console.log('✅ API has many venue.city = "New York" events');
        console.log('❓ But app filtering isn\'t working - investigate app logic');
      }
      
    } catch (error) {
      console.log(`❌ Analysis error: ${error.message}`);
    }

    console.log('\n🚀 CONCLUSION:');
    console.log('🔍 Look for the API call that returns exactly 4 events');
    console.log('🎯 That\'s the pattern the app actually uses');
    console.log('🔧 Fix THAT specific filtering logic, not general venue.city');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the API call analysis
debugActualAPICalls().catch(console.error);
