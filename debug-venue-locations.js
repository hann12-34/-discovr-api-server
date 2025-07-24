/**
 * Debug venue locations and coordinates to fix map display issues
 */

const axios = require('axios');

async function debugVenueLocations() {
  console.log('🗺️ DEBUGGING VENUE LOCATIONS AND COORDINATES');
  console.log('=' .repeat(60));
  
  try {
    const response = await axios.get('https://discovr-proxy-server.onrender.com/api/v1/venues/events/all');
    
    console.log(`✅ API Response Status: ${response.status}`);
    
    const events = response.data.events || response.data;
    console.log(`📊 Total Events: ${events.length}`);
    
    // Find the specific event from the screenshot
    const grossmansEvents = events.filter(event => {
      const title = event.title || event.name || '';
      const venueName = event.venue?.name || '';
      return title.toLowerCase().includes('new orleans connection') || 
             venueName.toLowerCase().includes('grossman');
    });
    
    console.log(`\n🎵 Found ${grossmansEvents.length} Grossman's Tavern events:`);
    
    grossmansEvents.forEach((event, index) => {
      console.log(`\n--- Event ${index + 1} ---`);
      console.log(`Title: ${event.title || event.name}`);
      console.log(`Venue Name: ${event.venue?.name}`);
      console.log(`Venue City: ${event.venue?.city}`);
      console.log(`Location: ${event.location}`);
      console.log(`Address: ${event.venue?.address}`);
      console.log(`Coordinates:`, event.venue?.coordinates);
      console.log(`Venue Object:`, JSON.stringify(event.venue, null, 2));
    });
    
    // Check for common venue location issues
    console.log('\n🔍 ANALYZING VENUE LOCATION ISSUES:');
    
    let venuesWithoutCoordinates = 0;
    let venuesWithWrongCity = 0;
    let venuesWithGenericAddress = 0;
    
    const sampleIssues = [];
    
    events.forEach((event, index) => {
      const venue = event.venue;
      if (!venue) return;
      
      // Check for missing coordinates
      if (!venue.coordinates || !venue.coordinates.lat || !venue.coordinates.lng) {
        venuesWithoutCoordinates++;
        if (sampleIssues.length < 5) {
          sampleIssues.push({
            type: 'Missing Coordinates',
            title: event.title || event.name,
            venue: venue.name,
            issue: 'No coordinates'
          });
        }
      }
      
      // Check for city mismatches (Toronto venues showing as Vancouver)
      const title = (event.title || event.name || '').toLowerCase();
      const location = (event.location || '').toLowerCase();
      const venueCity = (venue.city || '').toLowerCase();
      
      if ((title.includes('toronto') || location.includes('toronto')) && 
          venueCity.includes('vancouver')) {
        venuesWithWrongCity++;
        if (sampleIssues.length < 10) {
          sampleIssues.push({
            type: 'Wrong City',
            title: event.title || event.name,
            venue: venue.name,
            issue: `Event seems Toronto-based but venue city is ${venue.city}`
          });
        }
      }
      
      // Check for generic addresses
      const address = (venue.address || '').toLowerCase();
      if (address.includes('vancouver, bc') && !address.includes('street') && 
          !address.includes('avenue') && !address.includes('road')) {
        venuesWithGenericAddress++;
        if (sampleIssues.length < 15) {
          sampleIssues.push({
            type: 'Generic Address',
            title: event.title || event.name,
            venue: venue.name,
            issue: `Generic address: ${venue.address}`
          });
        }
      }
    });
    
    console.log(`❌ Venues without coordinates: ${venuesWithoutCoordinates}`);
    console.log(`❌ Venues with wrong city: ${venuesWithWrongCity}`);
    console.log(`❌ Venues with generic address: ${venuesWithGenericAddress}`);
    
    console.log('\n📋 Sample Issues:');
    sampleIssues.forEach((issue, index) => {
      console.log(`${index + 1}. [${issue.type}] ${issue.venue} - "${issue.title}"`);
      console.log(`   Issue: ${issue.issue}`);
    });
    
    // Look for known Toronto venues that might be miscategorized
    console.log('\n🏢 KNOWN TORONTO VENUES ANALYSIS:');
    const knownTorontoVenues = [
      'grossman\'s tavern',
      'danforth music hall',
      'phoenix concert theatre',
      'the opera house',
      'the mod club',
      'the horseshoe tavern',
      'the rex hotel',
      'koerner hall'
    ];
    
    knownTorontoVenues.forEach(venueName => {
      const venueEvents = events.filter(event => 
        (event.venue?.name || '').toLowerCase().includes(venueName)
      );
      
      if (venueEvents.length > 0) {
        const sampleEvent = venueEvents[0];
        console.log(`\n🎪 ${venueName.toUpperCase()}:`);
        console.log(`   Events: ${venueEvents.length}`);
        console.log(`   City: ${sampleEvent.venue?.city}`);
        console.log(`   Address: ${sampleEvent.venue?.address}`);
        console.log(`   Coordinates: ${JSON.stringify(sampleEvent.venue?.coordinates)}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error debugging venue locations:', error.message);
  }
}

// Run the debug
debugVenueLocations().catch(console.error);
