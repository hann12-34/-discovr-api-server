/**
 * Clean up bad Calgary events (UI elements, dates as titles)
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';

async function cleanBadEvents() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('discovr');
    const collection = db.collection('events');
    
    // Delete events with UI element titles or date-only titles
    const badTitles = [
      'Details',
      'LIVE MUSIC',
      'View Details',
      'More Info',
      'Buy Tickets',
      'Calendar',
      'Filter'
    ];
    
    const deleteResult = await collection.deleteMany({
      city: 'Calgary',
      $or: [
        { title: { $in: badTitles } },
        { title: { $regex: /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{4}?/i } },  // Date-only titles
        { title: { $regex: /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}/i } },  // Partial dates
        { title: { $regex: /^December \d{1,2}, 2\.\.\.$/ } }  // Truncated dates like "December 19, 2..."
      ]
    });
    
    console.log(`🗑️ Removed ${deleteResult.deletedCount} bad Calgary events`);
    
    // Count remaining Calgary events
    const remaining = await collection.countDocuments({ city: 'Calgary' });
    console.log(`✅ Remaining Calgary events: ${remaining}`);
    
    // Show sample of remaining events
    const samples = await collection.find({ city: 'Calgary' }).limit(5).toArray();
    console.log('\n📋 Sample of clean events:');
    samples.forEach(e => console.log(`   - ${e.title} (${e.venue.name})`));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

cleanBadEvents();
