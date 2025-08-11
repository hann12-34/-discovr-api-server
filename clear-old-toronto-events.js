/**
 * CLEAR OLD TORONTO EVENTS
 * 
 * Removes old Toronto events with broken venue data from database
 * so fresh events with proper venue names can be imported
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = "mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr";

async function clearOldTorontoEvents() {
  console.log('🧹 CLEARING OLD TORONTO EVENTS FROM DATABASE');
  console.log('='.repeat(50));
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('discovr');
    const collection = db.collection('events');
    
    // Count current Toronto events
    const torontoCount = await collection.countDocuments({ 
      city: { $regex: /toronto/i } 
    });
    console.log(`📊 Current Toronto events in database: ${torontoCount}`);
    
    // Check for events with broken venue data
    const brokenVenueCount = await collection.countDocuments({
      city: { $regex: /toronto/i },
      $or: [
        { venue: { $exists: false } },
        { venue: null },
        { venue: "Unknown" },
        { venue: { $type: "object" } }  // This catches "[object Object]"
      ]
    });
    console.log(`🚨 Toronto events with broken venue data: ${brokenVenueCount}`);
    
    if (torontoCount > 0) {
      console.log('\n🗑️ Deleting old Toronto events...');
      
      const result = await collection.deleteMany({
        city: { $regex: /toronto/i }
      });
      
      console.log(`✅ Deleted ${result.deletedCount} old Toronto events`);
      
      // Verify deletion
      const remainingCount = await collection.countDocuments({ 
        city: { $regex: /toronto/i } 
      });
      console.log(`📊 Remaining Toronto events: ${remainingCount}`);
      
    } else {
      console.log('⚠️ No Toronto events found to delete');
    }
    
    console.log('\n🎯 READY FOR FRESH IMPORT!');
    console.log('Next step: Run Toronto scrapers to import events with proper venue names');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the cleanup
clearOldTorontoEvents().catch(console.error);
