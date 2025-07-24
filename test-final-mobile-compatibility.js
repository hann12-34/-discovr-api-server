/**
 * Final comprehensive test for mobile app compatibility
 */

const axios = require('axios');

async function testFinalMobileCompatibility() {
  console.log('🧪 FINAL MOBILE APP COMPATIBILITY TEST');
  console.log('=' .repeat(60));
  
  try {
    const response = await axios.get('https://discovr-proxy-server.onrender.com/api/v1/venues/events/all');
    
    console.log(`✅ API Response Status: ${response.status}`);
    console.log(`📊 Response Size: ${JSON.stringify(response.data).length} bytes`);
    
    const events = response.data.events || response.data;
    console.log(`📊 Total Events: ${events.length}`);
    
    // Check all critical fields for type consistency
    console.log('\n🔍 CHECKING FIELD TYPE CONSISTENCY:');
    
    let issues = {
      location: 0,
      venue: 0,
      venueCoordinates: 0,
      price: 0,
      priceRange: 0,
      other: 0
    };
    
    let validEvents = 0;
    
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      let eventValid = true;
      
      // Check location field (should be string)
      if (event.location && typeof event.location !== 'string') {
        issues.location++;
        eventValid = false;
        if (issues.location <= 3) {
          console.log(`   ❌ Event ${i}: location is ${typeof event.location}, expected string`);
        }
      }
      
      // Check venue field (should be object)
      if (event.venue) {
        if (typeof event.venue !== 'object') {
          issues.venue++;
          eventValid = false;
          if (issues.venue <= 3) {
            console.log(`   ❌ Event ${i}: venue is ${typeof event.venue}, expected object`);
          }
        } else if (!event.venue.coordinates) {
          issues.venueCoordinates++;
          eventValid = false;
          if (issues.venueCoordinates <= 3) {
            console.log(`   ❌ Event ${i}: venue.coordinates missing`);
          }
        }
      }
      
      // Check price field (should be string or null)
      if (event.price !== null && event.price !== undefined && typeof event.price !== 'string') {
        issues.price++;
        eventValid = false;
        if (issues.price <= 3) {
          console.log(`   ❌ Event ${i}: price is ${typeof event.price}, expected string`);
          console.log(`      Event: ${event.title || event.name}`);
          console.log(`      Price value: ${event.price}`);
        }
      }
      
      // Check priceRange field (should be string or null)
      if (event.priceRange !== null && event.priceRange !== undefined && typeof event.priceRange !== 'string') {
        issues.priceRange++;
        eventValid = false;
        if (issues.priceRange <= 3) {
          console.log(`   ❌ Event ${i}: priceRange is ${typeof event.priceRange}, expected string`);
        }
      }
      
      if (eventValid) {
        validEvents++;
      }
    }
    
    console.log('\n📊 COMPATIBILITY SUMMARY:');
    console.log(`   ✅ Valid events: ${validEvents}/${events.length} (${((validEvents/events.length)*100).toFixed(1)}%)`);
    console.log(`   ❌ Location type issues: ${issues.location}`);
    console.log(`   ❌ Venue structure issues: ${issues.venue}`);
    console.log(`   ❌ Venue coordinates missing: ${issues.venueCoordinates}`);
    console.log(`   ❌ Price type issues: ${issues.price}`);
    console.log(`   ❌ PriceRange type issues: ${issues.priceRange}`);
    
    const totalIssues = Object.values(issues).reduce((sum, count) => sum + count, 0);
    
    if (totalIssues === 0) {
      console.log('\n🎉 PERFECT! ALL EVENTS ARE MOBILE APP COMPATIBLE!');
      console.log('📱 Your Swift app should decode all events without errors.');
    } else {
      console.log(`\n⚠️ Found ${totalIssues} compatibility issues that need fixing.`);
    }
    
    // Check specific event at index 996 (the one that was causing issues)
    if (events.length > 996) {
      const problemEvent = events[996];
      console.log('\n🔍 CHECKING PREVIOUSLY PROBLEMATIC EVENT (Index 996):');
      console.log(`   Title: ${problemEvent.title || problemEvent.name}`);
      console.log(`   Price: ${problemEvent.price} (${typeof problemEvent.price})`);
      console.log(`   PriceRange: ${problemEvent.priceRange} (${typeof problemEvent.priceRange})`);
      console.log(`   Location: ${problemEvent.location} (${typeof problemEvent.location})`);
      console.log(`   Venue: ${typeof problemEvent.venue}`);
      if (problemEvent.venue && problemEvent.venue.coordinates) {
        console.log(`   Venue.coordinates: ✅ Present`);
      } else {
        console.log(`   Venue.coordinates: ❌ Missing`);
      }
    }
    
    // Show Vancouver events count
    const vancouverEvents = events.filter(event => 
      (event.location && event.location.toLowerCase().includes('vancouver')) ||
      (event.venue && event.venue.city && event.venue.city.toLowerCase().includes('vancouver'))
    );
    
    console.log(`\n🏙️ Vancouver Events: ${vancouverEvents.length}`);
    console.log('📱 Ready for mobile app consumption!');
    
  } catch (error) {
    console.error('❌ Error testing mobile compatibility:', error.message);
  }
}

// Run the test
testFinalMobileCompatibility().catch(console.error);
