/**
 * Script to check for events in the MongoDB database
 * This will list the count of events for each source identifier
 */

const { MongoClient } = require('mongodb');

// MongoDB connection URI
const uri = 'mongodb://localhost:27017';

// Database and collection names
const dbName = 'discovr';
const collectionName = 'events';

async function checkEvents() {
  console.log('🔍 Checking for events in the database...');
  
  const client = new MongoClient(uri);
  
  try {
    // Connect to MongoDB
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    // Count total events
    const totalCount = await collection.countDocuments();
    console.log(`📊 Total events in database: ${totalCount}`);
    
    // Check for our specific events
    console.log('\n🔍 Searching for our newly added events:\n');
    
    // Squamish Beer Festival
    const squamishCount = await collection.countDocuments({ 
      'sourceURL': { $regex: 'squamishbeerfestival.com' } 
    });
    console.log(`🍺 Squamish Beer Festival events: ${squamishCount}`);
    
    // Shipyards Night Market
    const shipyardsCount = await collection.countDocuments({ 
      'sourceURL': { $regex: 'shipyardsnightmarket.com' } 
    });
    console.log(`🌙 Shipyards Night Market events: ${shipyardsCount}`);
    
    // Junction Public Market (should be 0 as we corrected it to not generate events)
    const junctionCount = await collection.countDocuments({ 
      'sourceURL': { $regex: 'junctionpublicmarket.com' } 
    });
    console.log(`🏙️ Junction Public Market events: ${junctionCount}`);
    
    // Yaletown Jazz
    const yaletownCount = await collection.countDocuments({ 
      'sourceURL': { $regex: 'yaletowninfo.com' } 
    });
    console.log(`🎷 Yaletown Jazz events: ${yaletownCount}`);
    
    // List all unique source identifiers and their counts
    console.log('\n📝 All event sources in the database:');
    const sources = await collection.aggregate([
      { $group: { _id: "$sourceIdentifier", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    sources.forEach(source => {
      console.log(`- ${source._id || 'undefined'}: ${source.count} events`);
    });
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  } finally {
    await client.close();
    console.log('\n🔒 MongoDB connection closed');
  }
}

// Run the function
checkEvents();
