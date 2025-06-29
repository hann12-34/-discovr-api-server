/**
 * Sync Local MongoDB Events to Cloud MongoDB
 * 
 * This script transfers events from your local MongoDB to the cloud MongoDB directly,
 * bypassing the read-only API.
 */

const mongoose = require('mongoose');
const { MongoClient, ServerApiVersion } = require('mongodb');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

// Connection URIs
const LOCAL_MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/discovr';
const CLOUD_MONGODB_URI = "mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr";

// Event schema for local MongoDB
const eventSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: String,
  description: String,
  date: String,
  startDate: Date,
  endDate: Date,
  image: String,
  venue: Object,
  category: String,
  categories: [String],
  sourceURL: String,
  ticketURL: String,
  location: String,
  lastUpdated: Date
}, { strict: false });

/**
 * Format event for cloud MongoDB
 */
const formatEventForCloud = (event) => {
  // Convert Mongoose document to plain object
  const plainEvent = typeof event.toObject === 'function' ? event.toObject() : event;
  
  // Remove MongoDB specific fields that might cause issues
  delete plainEvent._id;
  delete plainEvent.__v;
  
  return {
    id: plainEvent.id,
    title: plainEvent.title,
    description: plainEvent.description || '',
    startDate: plainEvent.startDate,
    endDate: plainEvent.endDate || plainEvent.startDate,
    venue: plainEvent.venue || {
      name: plainEvent.venue?.name || 'Unknown Venue',
      location: plainEvent.venue?.location || { 
        address: '', 
        city: 'Vancouver', 
        province: 'BC', 
        country: 'Canada' 
      }
    },
    category: plainEvent.category || 'Music',
    categories: plainEvent.categories || ['Music'],
    image: plainEvent.image || '',
    sourceURL: plainEvent.sourceURL || '',
    officialWebsite: plainEvent.officialWebsite || '',
    ticketURL: plainEvent.ticketURL || '',
    location: plainEvent.location || 'Vancouver, BC',
    lastUpdated: plainEvent.lastUpdated || new Date()
  };
};

/**
 * Main function to sync events from local to cloud
 */
async function syncEventsToCloud() {
  console.log('🚀 Starting synchronization of events from local to cloud MongoDB...');
  
  // Statistics object
  const stats = {
    totalLocal: 0,
    totalCloud: 0,
    added: 0,
    skipped: 0,
    errors: 0
  };
  
  // Local MongoDB connection
  let localMongoose;
  
  // Cloud MongoDB connection
  let cloudClient;
  
  try {
    // Connect to local MongoDB
    console.log('🔄 Connecting to local MongoDB...');
    localMongoose = await mongoose.connect(LOCAL_MONGODB_URI);
    console.log('✅ Connected to local MongoDB');
    
    // Get event model
    const Event = mongoose.model('Event', eventSchema);
    
    // Get all events from local DB
    const localEvents = await Event.find({});
    stats.totalLocal = localEvents.length;
    console.log(`📊 Found ${localEvents.length} events in local database`);
    
    if (localEvents.length === 0) {
      console.log('❌ No events found in local database. Nothing to sync.');
      return;
    }
    
    // Connect to cloud MongoDB
    console.log('🔄 Connecting to cloud MongoDB...');
    cloudClient = new MongoClient(CLOUD_MONGODB_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });
    
    await cloudClient.connect();
    console.log('✅ Connected to cloud MongoDB');
    
    // Get cloud database and collection
    const cloudDb = cloudClient.db('discovr');
    const eventsCollection = cloudDb.collection('events');
    
    // Check existing events in cloud
    const cloudEventsCount = await eventsCollection.countDocuments();
    stats.totalCloud = cloudEventsCount;
    console.log(`📊 Found ${cloudEventsCount} events in cloud database`);
    
    // Import events one by one
    console.log('🔄 Importing events to cloud database...');
    
    for (const event of localEvents) {
      try {
        // Format event for cloud
        const formattedEvent = formatEventForCloud(event);
        
        // Check if event already exists in cloud
        const existingEvent = await eventsCollection.findOne({ id: formattedEvent.id });
        
        if (existingEvent) {
          // Event exists, skip it
          stats.skipped++;
          console.log(`⏭️ Skipped existing event: "${formattedEvent.title}"`);
        } else {
          // Event doesn't exist, add it
          await eventsCollection.insertOne(formattedEvent);
          stats.added++;
          console.log(`✅ Added event: "${formattedEvent.title}"`);
        }
      } catch (error) {
        // Handle error for this event
        stats.errors++;
        console.error(`❌ Error importing event "${event.title}":`, error.message);
      }
    }
    
    // Print summary
    console.log('\n📊 SYNC SUMMARY');
    console.log('=============');
    console.log(`Local events: ${stats.totalLocal}`);
    console.log(`Cloud events before sync: ${stats.totalCloud}`);
    console.log(`Added to cloud: ${stats.added}`);
    console.log(`Skipped (already in cloud): ${stats.skipped}`);
    console.log(`Errors: ${stats.errors}`);
    console.log(`Cloud events after sync: ${stats.totalCloud + stats.added}`);
    
    // Verify final count
    const finalCloudEventsCount = await eventsCollection.countDocuments();
    console.log(`📊 Verified cloud events count: ${finalCloudEventsCount}`);
    
  } catch (error) {
    console.error('❌ Sync error:', error.message);
  } finally {
    // Close connections
    console.log('🔄 Closing database connections...');
    
    if (localMongoose) {
      await mongoose.disconnect();
      console.log('✅ Disconnected from local MongoDB');
    }
    
    if (cloudClient) {
      await cloudClient.close();
      console.log('✅ Disconnected from cloud MongoDB');
    }
    
    console.log('🏁 Synchronization completed!');
  }
}

// Run the sync
syncEventsToCloud().catch(console.error);
