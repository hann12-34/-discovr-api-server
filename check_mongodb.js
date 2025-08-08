const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkMongoDB() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('discovr');
    const events = db.collection('events');
    
    console.log('=== MONGODB EVENT ANALYSIS ===');
    
    // Get total count
    const total = await events.countDocuments();
    console.log(`Total events: ${total}`);
    
    // Check events missing price field entirely
    const missingPrice = await events.countDocuments({ price: { $exists: false } });
    console.log(`Events missing price field: ${missingPrice}`);
    
    // Check events with null/empty price
    const nullPrice = await events.countDocuments({ 
      $or: [
        { price: null }, 
        { price: '' }, 
        { price: undefined }
      ] 
    });
    console.log(`Events with null/empty price: ${nullPrice}`);
    
    // Check events with non-string price
    const nonStringPrice = await events.countDocuments({ 
      price: { $exists: true, $not: { $type: "string" } }
    });
    console.log(`Events with non-string price: ${nonStringPrice}`);
    
    // Sample events with problematic prices
    console.log('\n=== SAMPLE PROBLEMATIC EVENTS ===');
    const problematic = await events.find({
      $or: [
        { price: { $exists: false } },
        { price: null },
        { price: '' },
        { price: undefined },
        { price: { $not: { $type: "string" } } }
      ]
    }).limit(10).toArray();
    
    problematic.forEach((event, i) => {
      console.log(`${i+1}. ${event.title || 'No title'}`);
      console.log(`   Venue: ${event.venue || 'No venue'}`);
      console.log(`   Price: ${JSON.stringify(event.price)} (type: ${typeof event.price})`);
      console.log(`   Has price field: ${event.hasOwnProperty('price')}`);
      console.log(`   ID: ${event._id}`);
      console.log('   ---');
    });
    
    // Sample of good events for comparison
    console.log('\n=== SAMPLE GOOD EVENTS ===');
    const goodEvents = await events.find({
      price: { $exists: true, $type: "string", $ne: "" }
    }).limit(5).toArray();
    
    goodEvents.forEach((event, i) => {
      console.log(`${i+1}. ${event.title || 'No title'}`);
      console.log(`   Price: ${JSON.stringify(event.price)} (type: ${typeof event.price})`);
      console.log('   ---');
    });
    
  } catch (error) {
    console.error('MongoDB Error:', error);
  } finally {
    await client.close();
  }
}

checkMongoDB();
