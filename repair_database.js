const { MongoClient } = require('mongodb');
require('dotenv').config();

async function repairDatabase() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('discovr');
    const events = db.collection('events');
    
    console.log('=== REPAIRING DATABASE ===');
    
    // Find events missing price field entirely
    const missingPriceQuery = { price: { $exists: false } };
    const missingPriceCount = await events.countDocuments(missingPriceQuery);
    console.log(`Events missing price field: ${missingPriceCount}`);
    
    // Fix events missing price field entirely
    if (missingPriceCount > 0) {
      console.log('Adding price field to events missing it...');
      const result1 = await events.updateMany(
        missingPriceQuery,
        { $set: { price: "See website for details" } }
      );
      console.log(`✅ Added price field to ${result1.modifiedCount} events`);
    }
    
    // Find and fix events with null/empty price
    const nullPriceQuery = { 
      $or: [
        { price: null }, 
        { price: "" }, 
        { price: undefined }
      ] 
    };
    const nullPriceCount = await events.countDocuments(nullPriceQuery);
    console.log(`Events with null/empty price: ${nullPriceCount}`);
    
    if (nullPriceCount > 0) {
      console.log('Fixing null/empty price fields...');
      const result2 = await events.updateMany(
        nullPriceQuery,
        { $set: { price: "See website for details" } }
      );
      console.log(`✅ Fixed ${result2.modifiedCount} null/empty price fields`);
    }
    
    // Find and fix events with non-string price
    const nonStringPriceQuery = { 
      price: { $exists: true, $not: { $type: "string" } }
    };
    const nonStringPriceCount = await events.countDocuments(nonStringPriceQuery);
    console.log(`Events with non-string price: ${nonStringPriceCount}`);
    
    if (nonStringPriceCount > 0) {
      console.log('Converting non-string prices to strings...');
      const nonStringEvents = await events.find(nonStringPriceQuery).toArray();
      
      for (const event of nonStringEvents) {
        let newPrice = "See website for details";
        if (event.price !== null && event.price !== undefined && event.price !== '') {
          newPrice = String(event.price);
        }
        
        await events.updateOne(
          { _id: event._id },
          { $set: { price: newPrice } }
        );
      }
      console.log(`✅ Converted ${nonStringEvents.length} non-string prices to strings`);
    }
    
    // Verify repair
    console.log('\n=== VERIFICATION ===');
    const totalEvents = await events.countDocuments();
    const missingAfter = await events.countDocuments({ price: { $exists: false } });
    const nullAfter = await events.countDocuments({ 
      $or: [{ price: null }, { price: '' }, { price: undefined }] 
    });
    const nonStringAfter = await events.countDocuments({ 
      price: { $exists: true, $not: { $type: "string" } }
    });
    
    console.log(`Total events: ${totalEvents}`);
    console.log(`Missing price field: ${missingAfter} (should be 0)`);
    console.log(`Null/empty price: ${nullAfter} (should be 0)`);
    console.log(`Non-string price: ${nonStringAfter} (should be 0)`);
    
    if (missingAfter === 0 && nullAfter === 0 && nonStringAfter === 0) {
      console.log('\n🎉 DATABASE REPAIR SUCCESSFUL!');
      console.log('All events now have a valid string price field.');
    } else {
      console.log('\n⚠️  Some issues remain. Please check the output above.');
    }
    
  } catch (error) {
    console.error('Database repair error:', error);
  } finally {
    await client.close();
  }
}

repairDatabase();
