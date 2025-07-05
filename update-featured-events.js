/**
 * Update Featured Events Script
 * 
 * This script:
 * 1. Updates any remaining San Francisco references in events to Vancouver
 * 2. Creates a collection of featured events for the top section of the app
 * 3. Selects 5 high-quality Vancouver events to feature
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

// MongoDB connection string
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/discovr';

// Connect to MongoDB
async function connectToMongoDB() {
  const client = new MongoClient(mongoURI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('discovr');
    const eventsCollection = db.collection('events');
    const featuredEventsCollection = db.collection('featuredEvents');
    
    return { client, eventsCollection, featuredEventsCollection };
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    throw error;
  }
}

// Update any remaining San Francisco references
async function updateSanFranciscoReferences(eventsCollection) {
  console.log('\n📋 Updating any remaining San Francisco references...');
  
  const sfReferences = [
    { field: 'venue.city', value: 'San Francisco' },
    { field: 'venue.state', value: 'CA' },
    { field: 'venue.country', value: 'US' },
    { field: 'location', value: /San Francisco/i },
    { field: 'title', value: /San Francisco/i },
    { field: 'description', value: /San Francisco/i }
  ];
  
  let totalUpdated = 0;
  
  for (const ref of sfReferences) {
    const query = {};
    query[ref.field] = ref.value;
    
    const updateOperation = {};
    
    if (ref.field === 'venue.city') {
      updateOperation.$set = { 'venue.city': 'Vancouver' };
    } else if (ref.field === 'venue.state') {
      updateOperation.$set = { 'venue.state': 'BC' };
    } else if (ref.field === 'venue.country') {
      updateOperation.$set = { 'venue.country': 'Canada' };
    } else if (ref.field === 'location') {
      updateOperation.$set = { location: 'Vancouver, BC' };
    } else if (ref.field === 'title') {
      updateOperation.$set = { title: { $concat: [{ $replaceAll: { input: '$title', find: 'San Francisco', replacement: 'Vancouver' } }] } };
    } else if (ref.field === 'description') {
      updateOperation.$set = { description: { $concat: [{ $replaceAll: { input: '$description', find: 'San Francisco', replacement: 'Vancouver' } }] } };
    }
    
    try {
      // For regex fields, we need to use updateMany with a function
      if (ref.field === 'title' || ref.field === 'description' || ref.field === 'location') {
        const documents = await eventsCollection.find(query).toArray();
        
        for (const doc of documents) {
          const fieldValue = ref.field.split('.').reduce((obj, key) => obj && obj[key], doc);
          
          if (fieldValue) {
            const updatedValue = fieldValue.replace(/San Francisco/gi, 'Vancouver');
            
            const updateDoc = { $set: {} };
            updateDoc.$set[ref.field] = updatedValue;
            
            await eventsCollection.updateOne({ _id: doc._id }, updateDoc);
            totalUpdated++;
          }
        }
      } else {
        // For exact match fields, we can use updateMany directly
        const result = await eventsCollection.updateMany(query, updateOperation);
        totalUpdated += result.modifiedCount;
      }
    } catch (error) {
      console.error(`❌ Error updating ${ref.field}:`, error.message);
    }
  }
  
  // Update any references to Moscone Center
  try {
    const mosconeResult = await eventsCollection.updateMany(
      { 'venue.name': 'Moscone Center' },
      { $set: { 'venue.name': 'Vancouver Convention Centre' } }
    );
    totalUpdated += mosconeResult.modifiedCount;
    
    // Update any references to Golden Gate Park
    const goldenGateResult = await eventsCollection.updateMany(
      { 'venue.name': 'Golden Gate Park' },
      { $set: { 'venue.name': 'Stanley Park' } }
    );
    totalUpdated += goldenGateResult.modifiedCount;
  } catch (error) {
    console.error('❌ Error updating venue names:', error.message);
  }
  
  console.log(`✅ Updated ${totalUpdated} San Francisco references to Vancouver`);
}

// Clear existing featured events
async function clearFeaturedEvents(featuredEventsCollection) {
  console.log('\n📋 Clearing existing featured events...');
  
  try {
    await featuredEventsCollection.deleteMany({});
    console.log('✅ Cleared existing featured events');
  } catch (error) {
    console.error('❌ Error clearing featured events:', error.message);
  }
}

// Select and add featured events
async function addFeaturedEvents(eventsCollection, featuredEventsCollection) {
  console.log('\n📋 Selecting events to feature...');
  
  try {
    // Find events with good quality data (has image, title, venue, etc.)
    const qualityEvents = await eventsCollection.find({
      image: { $ne: null, $ne: '' },
      title: { $ne: null, $ne: '' },
      'venue.name': { $ne: null, $ne: '' },
      startDate: { $ne: null }
    }).sort({ startDate: 1 }).limit(20).toArray();
    
    console.log(`Found ${qualityEvents.length} quality events to choose from`);
    
    // Select up to 5 events to feature
    const eventsToFeature = qualityEvents.slice(0, 5);
    
    // Add to featured events collection
    for (let i = 0; i < eventsToFeature.length; i++) {
      const event = eventsToFeature[i];
      
      await featuredEventsCollection.insertOne({
        eventId: event._id.toString(),
        order: i + 1,
        addedAt: new Date()
      });
      
      console.log(`✅ Added "${event.title}" to featured events`);
    }
    
    console.log(`✅ Added ${eventsToFeature.length} events to featured`);
  } catch (error) {
    console.error('❌ Error adding featured events:', error.message);
  }
}

// Main function
async function main() {
  console.log('🚀 Starting Featured Events Update...');
  console.log('====================================\n');
  
  let client;
  
  try {
    // Connect to MongoDB
    const { client: mongoClient, eventsCollection, featuredEventsCollection } = await connectToMongoDB();
    client = mongoClient;
    
    // Update any remaining San Francisco references
    await updateSanFranciscoReferences(eventsCollection);
    
    // Clear existing featured events
    await clearFeaturedEvents(featuredEventsCollection);
    
    // Select and add featured events
    await addFeaturedEvents(eventsCollection, featuredEventsCollection);
    
    console.log('\n✅ Featured events update completed successfully!');
  } catch (error) {
    console.error('\n❌ Error updating featured events:', error.message);
  } finally {
    // Close MongoDB connection
    if (client) {
      await client.close();
      console.log('\n✅ Disconnected from MongoDB');
    }
  }
}

// Run the script
main().catch(console.error);
