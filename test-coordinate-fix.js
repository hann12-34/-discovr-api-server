/**
 * Test the coordinate format fix for mobile app compatibility
 */

const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3098;

// Test endpoint that applies our coordinate format fix
app.get('/test-coordinates', async (req, res) => {
  try {
    console.log('🔄 Fetching events from live API...');
    const response = await axios.get('https://discovr-proxy-server.onrender.com/api/v1/venues/events/all');
    
    const events = response.data.events || response.data;
    console.log(`📊 Fetched ${events.length} events`);
    
    // Apply our coordinate format fix
    console.log('🗺️ Converting coordinate formats...');
    let coordinatesFixed = 0;
    
    const fixedEvents = events.map(event => {
      const validatedEvent = {...event};
      
      // Convert coordinates format for mobile app compatibility
      if (validatedEvent.venue && validatedEvent.venue.coordinates) {
        const coords = validatedEvent.venue.coordinates;
        
        // Convert from {latitude: X, longitude: Y} to location.coordinates: [longitude, latitude]
        if (coords.latitude !== undefined && coords.longitude !== undefined) {
          if (!validatedEvent.venue.location) {
            validatedEvent.venue.location = {};
          }
          validatedEvent.venue.location.coordinates = [coords.longitude, coords.latitude];
          coordinatesFixed++;
          
          console.log(`🗺️ Fixed coordinates for ${validatedEvent.venue.name}: [${coords.longitude}, ${coords.latitude}]`);
        }
      }
      
      return validatedEvent;
    });
    
    console.log(`✅ Fixed coordinates for ${coordinatesFixed} venues`);
    
    // Find and show the Grossman's Tavern event specifically
    const grossmansEvent = fixedEvents.find(event => 
      event.venue?.name?.toLowerCase().includes('grossman') &&
      (event.title || event.name || '').toLowerCase().includes('new orleans connection')
    );
    
    if (grossmansEvent) {
      console.log('\n🎵 GROSSMAN\'S TAVERN EVENT (New Orleans Connection):');
      console.log('Title:', grossmansEvent.title || grossmansEvent.name);
      console.log('Venue Name:', grossmansEvent.venue?.name);
      console.log('Venue City:', grossmansEvent.venue?.city);
      console.log('Venue Address:', grossmansEvent.venue?.address);
      console.log('Original Coordinates:', grossmansEvent.venue?.coordinates);
      console.log('Mobile App Coordinates:', grossmansEvent.venue?.location?.coordinates);
      console.log('Full Venue Object:', JSON.stringify(grossmansEvent.venue, null, 2));
    }
    
    // Show sample of other venues with coordinates
    console.log('\n📍 SAMPLE VENUES WITH FIXED COORDINATES:');
    const venuesWithCoords = fixedEvents.filter(event => 
      event.venue?.location?.coordinates && 
      event.venue.location.coordinates[0] !== 0 && 
      event.venue.location.coordinates[1] !== 0
    ).slice(0, 5);
    
    venuesWithCoords.forEach((event, index) => {
      console.log(`${index + 1}. ${event.venue.name} - [${event.venue.location.coordinates[0]}, ${event.venue.location.coordinates[1]}]`);
    });
    
    res.json({ 
      success: true,
      coordinatesFixed,
      sampleEvent: grossmansEvent,
      events: fixedEvents 
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: 'Failed to test coordinate fix' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Coordinate test server running on http://localhost:${PORT}`);
  console.log(`📡 Test endpoint: http://localhost:${PORT}/test-coordinates`);
  console.log('\n🧪 Testing coordinate format fix...');
  
  // Auto-test the endpoint
  setTimeout(async () => {
    try {
      const response = await axios.get(`http://localhost:${PORT}/test-coordinates`);
      console.log('\n✅ COORDINATE FORMAT TEST COMPLETED!');
      console.log(`🗺️ Fixed coordinates for ${response.data.coordinatesFixed} venues`);
      
      if (response.data.sampleEvent) {
        console.log('\n🎯 The mobile app should now show correct location for Grossman\'s Tavern!');
      }
      
      process.exit(0);
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    }
  }, 1000);
});
