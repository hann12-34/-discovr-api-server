/**
 * Remove ALL Theatre Calgary events (scraper is broken)
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';

async function cleanTheatre() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('discovr');
    const collection = db.collection('events');
    
    // Delete ALL Theatre Calgary events (scraper is broken)
    const deleteResult = await collection.deleteMany({
      'venue.name': 'Theatre Calgary'
    });
    
    console.log(`🗑️  Removed ${deleteResult.deletedCount} Theatre Calgary events`);
    
    // Count remaining Calgary events
    const remaining = await collection.countDocuments({ city: 'Calgary' });
    console.log(`✅ Remaining Calgary events: ${remaining}`);
    
    // Show what venues remain
    const venues = await collection.distinct('venue.name', { city: 'Calgary' });
    console.log(`\n📍 Remaining venues:`, venues);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

cleanTheatre();
