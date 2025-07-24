/**
 * Debug the specific events missing coordinates
 */

const axios = require('axios');

async function debugMissingCoordinates() {
  console.log('🔍 DEBUGGING MISSING COORDINATES');
  console.log('=' .repeat(50));
  
  try {
    const response = await axios.get('https://discovr-proxy-server.onrender.com/api/v1/venues/events/all');
    const events = response.data.events || response.data;
    
    console.log(`📊 Total Events: ${events.length}`);
    
    // Find events missing coordinates
    let missingCoordinatesEvents = [];
    
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      if (event.venue && typeof event.venue === 'object' && !event.venue.coordinates) {
        missingCoordinatesEvents.push({
          index: i,
          event: event
        });
      }
    }
    
    console.log(`\n📊 Found ${missingCoordinatesEvents.length} events missing coordinates:`);
    
    missingCoordinatesEvents.forEach(({ index, event }) => {
      console.log(`\n   Index ${index}:`);
      console.log(`   Title: ${event.title || event.name || 'No title'}`);
      console.log(`   ID: ${event.id || event._id}`);
      console.log(`   Venue: ${JSON.stringify(event.venue, null, 2)}`);
      console.log(`   Location: ${event.location}`);
    });
    
  } catch (error) {
    console.error('❌ Error debugging:', error.message);
  }
}

// Run the debug
debugMissingCoordinates().catch(console.error);
