/**
 * Script to add a new Toronto event from oldtowntoronto.ca website
 */
const { MongoClient } = require('mongodb');

async function addMarketStreetEvent() {
  const uri = 'mongodb://localhost:27017';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('🔌 Connected to MongoDB');
    
    const db = client.db('discovr');
    const eventsCollection = db.collection('events');
    
    // Create the new Toronto event
    const newEvent = {
      id: `toronto-market-street-music-${Date.now()}`,
      name: "Toronto - I Heart Market Street Music Series",
      title: "Toronto - I Heart Market Street Music Series",
      description: "I Heart Market Street, Old Town Toronto's free urban park, welcomes talented local musicians to our street stage, located on Market Street, just north of The Esplanade. This series features a selection of Toronto musicians appearing Tuesday & Wednesday afternoons.",
      
      // Fields for proper city filtering
      city: "Toronto",
      cityId: "Toronto",
      venue: "Market Street Toronto",
      venueId: `toronto_market_street_${Date.now()}`,
      
      // Location with Toronto at beginning
      location: "Toronto - Market Street, north of The Esplanade",
      
      // Dates
      startDate: new Date("2025-07-16T17:00:00"),
      endDate: new Date("2025-07-16T19:00:00"),
      
      // Date range for app compatibility
      dateRange: {
        startDate: new Date("2025-07-16T17:00:00"),
        endDate: new Date("2025-07-16T19:00:00")
      },
      
      // Additional fields for the app
      season: "summer",
      type: "music",
      status: "active",
      category: "entertainment",
      
      // Website information
      sourceURL: "https://oldtowntoronto.ca/events-festivals/",
      officialWebsite: "https://oldtowntoronto.ca/",
      
      // Coordinates for Market Street, Toronto
      latitude: 43.6488,
      longitude: -79.3733,
      
      // Additional metadata
      lastUpdated: new Date(),
      dataSources: ["toronto-events", "oldtowntoronto.ca"],
      
      // Images
      image: "https://oldtowntoronto.ca/wp-content/uploads/2023/06/iheartmarketstreet23.jpg"
    };
    
    // First check if a similar event already exists to avoid duplicates
    const existingEvent = await eventsCollection.findOne({
      name: newEvent.name,
      startDate: newEvent.startDate
    });
    
    if (existingEvent) {
      console.log('⚠️ Similar event already exists, skipping insertion');
      console.log(existingEvent);
      return;
    }
    
    // Insert the new event
    const result = await eventsCollection.insertOne(newEvent);
    
    console.log(`✅ Added new Toronto Market Street event with ID: ${result.insertedId}`);
    console.log('📝 Event details:');
    console.log(JSON.stringify(newEvent, null, 2));
    
  } catch (error) {
    console.error('❌ Error adding Market Street event:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

addMarketStreetEvent().catch(console.error);
