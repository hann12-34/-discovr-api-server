/**
 * Script to find all Toronto-related events in any field
 * This helps us understand how events are being categorized and filtered
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function findAllTorontoRelatedEvents() {
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
    
    // 1. Find events with city="Toronto"
    const cityEvents = await eventsCollection.find({ city: "Toronto" }).toArray();
    console.log(`\n🏙️ Events with city="Toronto": ${cityEvents.length}`);
    
    if (cityEvents.length > 0) {
      console.log('Sample events:');
      cityEvents.slice(0, 3).forEach(event => {
        console.log(`- ${event.name} (${event._id})`);
      });
    }
    
    // 2. Find events with Toronto in name field
    const nameEvents = await eventsCollection.find({ 
      name: { $regex: 'Toronto', $options: 'i' },
      city: { $ne: "Toronto" }  // exclude those already counted
    }).toArray();
    console.log(`\n📝 Events with "Toronto" in name but NOT city="Toronto": ${nameEvents.length}`);
    
    if (nameEvents.length > 0) {
      console.log('Sample events:');
      nameEvents.slice(0, 3).forEach(event => {
        console.log(`- ${event.name} (${event._id})`);
        console.log(`  city: ${event.city || 'undefined'}`);
      });
    }
    
    // 3. Find events with Toronto in location field
    const locationEvents = await eventsCollection.find({ 
      location: { $regex: 'Toronto', $options: 'i' },
      city: { $ne: "Toronto" },
      name: { $not: { $regex: 'Toronto', $options: 'i' } }  // exclude those already counted
    }).toArray();
    console.log(`\n📍 Events with "Toronto" in location but NOT in name or city: ${locationEvents.length}`);
    
    if (locationEvents.length > 0) {
      console.log('Sample events:');
      locationEvents.slice(0, 3).forEach(event => {
        console.log(`- ${event.name} (${event._id})`);
        console.log(`  location: ${event.location || 'undefined'}`);
      });
    }
    
    // 4. Find events with Toronto in venue field
    const venueEvents = await eventsCollection.find({ 
      venue: { $regex: 'Toronto', $options: 'i' },
      city: { $ne: "Toronto" },
      name: { $not: { $regex: 'Toronto', $options: 'i' } },
      location: { $not: { $regex: 'Toronto', $options: 'i' } }  // exclude those already counted
    }).toArray();
    console.log(`\n🏢 Events with "Toronto" in venue but NOT in name, location, or city: ${venueEvents.length}`);
    
    if (venueEvents.length > 0) {
      console.log('Sample events:');
      venueEvents.slice(0, 3).forEach(event => {
        console.log(`- ${event.name} (${event._id})`);
        console.log(`  venue: ${event.venue || 'undefined'}`);
      });
    }
    
    // 5. Get the total count of Toronto-related events
    const totalTorontoEvents = cityEvents.length + nameEvents.length + locationEvents.length + venueEvents.length;
    console.log(`\n📊 Total Toronto-related events found: ${totalTorontoEvents}`);
    
    console.log('\n🔍 This analysis helps explain why the API may show more Toronto events than direct city="Toronto" queries');
    console.log('The Swift app uses a different logic to filter events by city, checking multiple fields including name, venue, and location');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the function
findAllTorontoRelatedEvents().catch(console.error);
