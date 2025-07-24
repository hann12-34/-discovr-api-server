/**
 * Script to deploy Toronto event fixes to the production MongoDB on Render.com
 * 
 * This script:
 * 1. Exports Toronto events from local database
 * 2. Connects to the Render.com MongoDB
 * 3. Updates or inserts the fixed Toronto events
 */
const { MongoClient } = require('mongodb');
const fs = require('fs').promises;
require('dotenv').config();

// Connection strings - replace with your actual Render.com MongoDB connection string
const LOCAL_MONGO_URI = 'mongodb://localhost:27017';
const REMOTE_MONGO_URI = process.env.RENDER_MONGO_URI || '';

async function deployTorontoFixes() {
  // Validate the remote connection string
  if (!REMOTE_MONGO_URI) {
    console.error('❌ Error: RENDER_MONGO_URI environment variable is not set!');
    console.error('Please create a .env file with your Render.com MongoDB connection string:');
    console.error('RENDER_MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/discovr');
    process.exit(1);
  }
  
  const localClient = new MongoClient(LOCAL_MONGO_URI);
  const remoteClient = new MongoClient(REMOTE_MONGO_URI);
  
  try {
    // Connect to both databases
    await localClient.connect();
    console.log('🔌 Connected to local MongoDB');
    
    await remoteClient.connect();
    console.log('🔌 Connected to Render.com MongoDB');
    
    const localDb = localClient.db('discovr');
    const remoteDb = remoteClient.db('discovr'); // Use the same database name
    
    // Find all Toronto events in local database
    const torontoEvents = await localDb.collection('events').find({
      city: "Toronto"
    }).toArray();
    
    console.log(`📊 Found ${torontoEvents.length} Toronto events in local database`);
    
    // Save a backup of the events to a JSON file before proceeding
    await fs.writeFile(
      'toronto-events-backup.json',
      JSON.stringify(torontoEvents, null, 2)
    );
    console.log('💾 Backup saved to toronto-events-backup.json');
    
    // Track stats
    let updated = 0;
    let inserted = 0;
    let unchanged = 0;
    
    // Process each Toronto event
    for (const event of torontoEvents) {
      // Check if event exists in remote database
      const existingEvent = await remoteDb.collection('events').findOne({
        $or: [
          { _id: event._id },
          { id: event.id }
        ]
      });
      
      if (existingEvent) {
        // Update existing event with our fixed version
        const result = await remoteDb.collection('events').updateOne(
          { _id: existingEvent._id },
          { $set: {
            // Fields to update
            name: event.name,
            title: event.title,
            city: "Toronto", 
            cityId: "Toronto",
            venue: "Toronto",
            location: event.location,
            startDate: event.startDate,
            endDate: event.endDate,
            dateRange: event.dateRange,
            status: "active",
            lastUpdated: new Date()
          }}
        );
        
        if (result.modifiedCount > 0) {
          updated++;
          console.log(`✅ Updated: ${event.name}`);
        } else {
          unchanged++;
          console.log(`ℹ️ Unchanged: ${event.name}`);
        }
      } else {
        // Insert the event into remote database
        const result = await remoteDb.collection('events').insertOne(event);
        inserted++;
        console.log(`➕ Inserted: ${event.name}`);
      }
    }
    
    // Verify Toronto events in remote database
    const remoteTorontoEvents = await remoteDb.collection('events').find({
      city: "Toronto"
    }).toArray();
    
    console.log('\n📊 Deployment Summary:');
    console.log(`📝 Total events processed: ${torontoEvents.length}`);
    console.log(`✅ Updated events: ${updated}`);
    console.log(`➕ Inserted new events: ${inserted}`);
    console.log(`ℹ️ Unchanged events: ${unchanged}`);
    console.log(`📊 Total Toronto events in remote database: ${remoteTorontoEvents.length}`);
    
  } catch (error) {
    console.error('❌ Error deploying Toronto fixes to Render.com:', error);
  } finally {
    await localClient.close();
    await remoteClient.close();
    console.log('🔌 Disconnected from both MongoDB instances');
  }
}

deployTorontoFixes().catch(console.error);
