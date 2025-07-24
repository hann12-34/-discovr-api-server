/**
 * Test script to check Toronto events query
 */

const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
require('dotenv').config();

// MongoDB connection string
const MONGODB_URI = 'mongodb://localhost:27017/discovr';
const DB_NAME = 'discovr';
const COLLECTION_NAME = 'events';

async function testTorontoQuery() {
  // Using MongoDB native driver
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    
    // 1. Count all events
    const totalCount = await collection.countDocuments();
    console.log(`Total events in database: ${totalCount}`);
    
    // 2. Check for Toronto events using venue.city
    const torontoByVenueCity = await collection.find({ 'venue.city': 'Toronto' }).toArray();
    console.log(`\nToronto events by venue.city: ${torontoByVenueCity.length}`);
    
    if (torontoByVenueCity.length > 0) {
      console.log('Sample Toronto events:');
      torontoByVenueCity.slice(0, 3).forEach(event => {
        console.log(`- ${event.title} at ${event.venue?.name}`);
      });
    }
    
    // 3. Test the combined query we're using in the API
    console.log('\nTesting the combined query:');
    const cityQuery = {
      $or: [
        { 'venue.city': { $regex: 'Toronto', $options: 'i' } },
        { city: { $regex: 'Toronto', $options: 'i' } }
      ]
    };
    
    const torontoByOr = await collection.find(cityQuery).toArray();
    console.log(`Toronto events with $or query: ${torontoByOr.length}`);
    
    if (torontoByOr.length > 0) {
      console.log('Sample events from $or query:');
      torontoByOr.slice(0, 3).forEach(event => {
        console.log(`- ${event.title} at ${event.venue?.name}`);
      });
    }
    
    // 4. Check name property (it might be name instead of title)
    const eventsWithName = await collection.countDocuments({ name: { $exists: true } });
    const eventsWithTitle = await collection.countDocuments({ title: { $exists: true } });
    console.log(`\nEvents with 'name' field: ${eventsWithName}`);
    console.log(`Events with 'title' field: ${eventsWithTitle}`);
    
    // 5. Check the API query structure
    const apiQuery = {
      $or: [
        { 'venue.city': { $regex: 'Toronto', $options: 'i' } },
        { city: { $regex: 'Toronto', $options: 'i' } }
      ]
    };
    
    const apiResults = await collection.find(apiQuery).toArray();
    console.log(`\nResults with API query structure: ${apiResults.length}`);
    
    if (apiResults.length > 0) {
      console.log('First event from API query:');
      console.log(JSON.stringify(apiResults[0], null, 2));
    }
    
  } catch (error) {
    console.error('Error testing Toronto query:', error);
  } finally {
    await client.close();
    console.log('\n📡 Closed MongoDB connection');
  }
}

// Run the function
testTorontoQuery();
