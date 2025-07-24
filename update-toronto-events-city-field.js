/**
 * Script to find all Toronto-related events and ensure they have city="Toronto"
 * This fixes the discrepancy between database queries and API queries
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function updateTorontoEventsCityField() {
  const mongoURI = process.env.MONGODB_URI;
  
  if (!mongoURI) {
    console.error('❌ Error: MONGODB_URI not found in .env file');
    return;
  }
  
  console.log(`🔌 Connecting to MongoDB: ${mongoURI.substring(0, 25)}...`);
  const client = new MongoClient(mongoURI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB successfully');
    
    const database = client.db('discovr');
    const eventsCollection = database.collection('events');
    
    // Find all events that have Toronto in name, venue, or location
    const torontoRegex = /toronto/i;
    const query = {
      $or: [
        { name: { $regex: torontoRegex } },
        { venue: { $regex: torontoRegex } },
        { location: { $regex: torontoRegex } },
        { title: { $regex: torontoRegex } }
      ]
    };
    
    const torontoEvents = await eventsCollection.find(query).toArray();
    console.log(`\n🔍 Found ${torontoEvents.length} events related to Toronto`);
    
    // Update each event to ensure city="Toronto"
    let updatedCount = 0;
    
    for (const event of torontoEvents) {
      // Skip if city is already Toronto
      if (event.city === "Toronto") {
        console.log(`✓ Event already has city="Toronto": ${event.name}`);
        continue;
      }
      
      // Update the event
      console.log(`🔄 Updating event: ${event.name}`);
      
      const updates = {
        city: "Toronto",
        cityId: "Toronto"
      };
      
      // If name is undefined or doesn't start with "Toronto - ", fix it
      if (!event.name) {
        // Use title or create a default name
        const title = event.title || 'Toronto Event';
        updates.name = `Toronto - ${title}`;
        console.log(`  Adding name: ${updates.name}`);
      } else if (!event.name.startsWith("Toronto - ")) {
        updates.name = `Toronto - ${event.name}`;
        console.log(`  Updating name: ${updates.name}`);
      }
      
      // If venue is not set or doesn't contain Toronto, update it
      if (!event.venue) {
        updates.venue = "Toronto";
        console.log(`  Adding venue: Toronto`);
      } else if (typeof event.venue === 'string' && !event.venue.toLowerCase().includes('toronto')) {
        updates.venue = "Toronto";
        console.log(`  Updating venue: Toronto`);
      }
      
      // If location is not set or doesn't contain Toronto, update it
      if (!event.location) {
        updates.location = "Toronto, Ontario";
        console.log(`  Adding location: Toronto, Ontario`);
      } else if (typeof event.location === 'string' && !event.location.toLowerCase().includes('toronto')) {
        updates.location = "Toronto, Ontario";
        console.log(`  Updating location: Toronto, Ontario`);
      }
      
      // Update the event in the database
      const result = await eventsCollection.updateOne(
        { _id: event._id },
        { $set: updates }
      );
      
      if (result.modifiedCount > 0) {
        updatedCount++;
      }
    }
    
    console.log(`\n✅ Updated ${updatedCount} events to have city="Toronto"`);
    
    // Verify how many events now have city="Toronto"
    const cityTorontoCount = await eventsCollection.countDocuments({ city: "Toronto" });
    console.log(`📊 Events with city="Toronto" after update: ${cityTorontoCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
    
    console.log('\n🔍 Next steps:');
    console.log('1. Check if more Toronto events appear in your admin interface');
    console.log('2. Verify that the Swift app can see these Toronto events');
    console.log('3. You may need to redeploy your Render application to see the changes');
  }
}

// Run the function
updateTorontoEventsCityField().catch(console.error);
