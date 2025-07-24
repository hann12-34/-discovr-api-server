/**
 * Fix price field type - convert numbers to strings for mobile app compatibility
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

async function fixPriceFieldType() {
  console.log('🔧 FIXING PRICE FIELD TYPE');
  console.log('=' .repeat(50));
  
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    return;
  }

  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const collection = db.collection('events');
    
    // Find events where price is a number
    console.log('\n🔍 Finding events where price is a number...');
    
    const eventsWithNumberPrice = await collection.find({
      price: { $type: 'number' }
    }).toArray();
    
    console.log(`📊 Found ${eventsWithNumberPrice.length} events with price as number`);
    
    if (eventsWithNumberPrice.length === 0) {
      console.log('✅ All price fields are already strings or null!');
      return;
    }
    
    // Show samples
    console.log('\n📋 Sample events with number prices:');
    eventsWithNumberPrice.slice(0, 5).forEach((event, index) => {
      console.log(`   ${index + 1}. ${event.title || event.name || 'No title'}`);
      console.log(`      price: ${event.price} (${typeof event.price})`);
      console.log('');
    });
    
    // Fix each event
    console.log('\n🔧 Converting number prices to strings...');
    let fixedCount = 0;
    
    for (const event of eventsWithNumberPrice) {
      let priceString = null;
      
      if (event.price !== null && event.price !== undefined) {
        if (event.price === 0) {
          priceString = 'Free';
        } else {
          priceString = `$${event.price}`;
        }
      }
      
      // Update the event
      await collection.updateOne(
        { _id: event._id },
        { $set: { price: priceString } }
      );
      
      fixedCount++;
      
      if (fixedCount <= 10) {
        console.log(`   ✅ Fixed: ${event.title || event.name || 'No title'}`);
        console.log(`      Changed price: ${event.price} → "${priceString}"`);
      }
    }
    
    console.log(`\n✅ Converted ${fixedCount} number prices to strings`);
    
    // Also check for other numeric fields that should be strings
    console.log('\n🔍 Checking other potentially problematic numeric fields...');
    
    // Check priceRange field
    const eventsWithNumberPriceRange = await collection.find({
      priceRange: { $type: 'number' }
    }).toArray();
    
    console.log(`📊 Found ${eventsWithNumberPriceRange.length} events with priceRange as number`);
    
    if (eventsWithNumberPriceRange.length > 0) {
      console.log('\n🔧 Converting number priceRange to strings...');
      let priceRangeFixed = 0;
      
      for (const event of eventsWithNumberPriceRange) {
        let priceRangeString = null;
        
        if (event.priceRange !== null && event.priceRange !== undefined) {
          if (event.priceRange === 0) {
            priceRangeString = '0-0';
          } else {
            priceRangeString = `0-${event.priceRange}`;
          }
        }
        
        await collection.updateOne(
          { _id: event._id },
          { $set: { priceRange: priceRangeString } }
        );
        
        priceRangeFixed++;
        
        if (priceRangeFixed <= 5) {
          console.log(`   ✅ Fixed priceRange: ${event.title || event.name || 'No title'}`);
          console.log(`      Changed priceRange: ${event.priceRange} → "${priceRangeString}"`);
        }
      }
      
      console.log(`✅ Converted ${priceRangeFixed} number priceRanges to strings`);
    }
    
    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    
    const remainingNumberPrices = await collection.find({
      price: { $type: 'number' }
    }).toArray();
    
    const remainingNumberPriceRanges = await collection.find({
      priceRange: { $type: 'number' }
    }).toArray();
    
    console.log(`📊 Remaining events with number prices: ${remainingNumberPrices.length}`);
    console.log(`📊 Remaining events with number priceRanges: ${remainingNumberPriceRanges.length}`);
    
    if (remainingNumberPrices.length === 0 && remainingNumberPriceRanges.length === 0) {
      console.log('🎉 ALL PRICE FIELDS FIXED!');
      console.log('📱 Mobile app should now decode prices properly.');
    } else {
      console.log('⚠️ Some price field issues remain');
    }
    
  } catch (error) {
    console.error('❌ Error fixing price field types:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixPriceFieldType().catch(console.error);
