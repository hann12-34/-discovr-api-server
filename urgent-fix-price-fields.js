/**
 * URGENT: Fix price field type mismatch causing mobile app decoding failure
 * 
 * Error: Expected String but found number at Index 1047 price field
 * Result: Mobile app shows 0 events instead of 2852 events
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/discovr';

async function urgentFixPriceFields() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🚨 URGENT: Connecting to MongoDB to fix price field type mismatch...');
    await client.connect();
    
    const db = client.db('discovr');
    const eventsCollection = db.collection('events');
    
    console.log('📊 Analyzing all events for price field types...');
    
    // Get all events to analyze price field types
    const allEvents = await eventsCollection.find({}).toArray();
    console.log(`📊 Total events: ${allEvents.length}`);
    
    let numericPrices = 0;
    let stringPrices = 0;
    let undefinedPrices = 0;
    let nullPrices = 0;
    let otherTypes = 0;
    
    const problematicEvents = [];
    
    // Analyze each event
    allEvents.forEach((event, index) => {
      const priceType = typeof event.price;
      
      if (priceType === 'number') {
        numericPrices++;
        problematicEvents.push({
          index,
          id: event._id,
          title: event.title || event.name || 'Untitled',
          price: event.price,
          priceType: priceType
        });
        
        // Check if this is the problematic Index 1047
        if (index === 1047) {
          console.log(`🎯 FOUND PROBLEMATIC EVENT AT INDEX 1047:`);
          console.log(`   ID: ${event._id}`);
          console.log(`   Title: ${event.title || event.name || 'Untitled'}`);
          console.log(`   Price: ${event.price} (${priceType})`);
        }
      } else if (priceType === 'string') {
        stringPrices++;
      } else if (priceType === 'undefined') {
        undefinedPrices++;
      } else if (event.price === null) {
        nullPrices++;
      } else {
        otherTypes++;
      }
    });
    
    console.log('\n📊 PRICE FIELD TYPE ANALYSIS:');
    console.log(`   ❌ Numeric prices: ${numericPrices}`);
    console.log(`   ✅ String prices: ${stringPrices}`);
    console.log(`   ⚪ Undefined prices: ${undefinedPrices}`);
    console.log(`   ⚪ Null prices: ${nullPrices}`);
    console.log(`   ❓ Other types: ${otherTypes}`);
    
    if (numericPrices > 0) {
      console.log('\n🚨 PROBLEMATIC EVENTS WITH NUMERIC PRICES:');
      problematicEvents.forEach((event, i) => {
        console.log(`   ${i + 1}. [Index ${event.index}] ${event.title} - Price: ${event.price} (${event.priceType})`);
      });
      
      console.log('\n🔧 FIXING ALL NUMERIC PRICES...');
      
      // Fix all events with numeric prices
      let fixedCount = 0;
      
      for (const event of problematicEvents) {
        try {
          const stringPrice = event.price.toString();
          
          const result = await eventsCollection.updateOne(
            { _id: event.id },
            { 
              $set: { 
                price: stringPrice,
                updatedAt: new Date()
              }
            }
          );
          
          if (result.modifiedCount > 0) {
            fixedCount++;
            console.log(`   ✅ Fixed: ${event.title} - Price: ${event.price} → "${stringPrice}"`);
          }
        } catch (error) {
          console.error(`   ❌ Error fixing ${event.title}: ${error.message}`);
        }
      }
      
      console.log(`\n🎉 FIXED ${fixedCount} EVENTS WITH NUMERIC PRICES!`);
      
      // Verify the fix
      console.log('\n🔍 VERIFYING FIX...');
      const remainingNumericPrices = await eventsCollection.countDocuments({ 
        price: { $type: "number" } 
      });
      
      console.log(`📊 Remaining numeric prices: ${remainingNumericPrices}`);
      
      if (remainingNumericPrices === 0) {
        console.log('✅ SUCCESS: All price fields are now strings or undefined/null!');
        console.log('✅ Mobile app decoding should now work correctly!');
      } else {
        console.log(`⚠️  WARNING: ${remainingNumericPrices} numeric prices still remain!`);
      }
      
    } else {
      console.log('✅ No numeric prices found - all price fields are properly formatted!');
    }
    
    console.log('\n📊 FINAL DATABASE STATE:');
    const finalStringPrices = await eventsCollection.countDocuments({ 
      price: { $type: "string" } 
    });
    const finalNumericPrices = await eventsCollection.countDocuments({ 
      price: { $type: "number" } 
    });
    const finalUndefinedPrices = await eventsCollection.countDocuments({ 
      price: { $exists: false } 
    });
    const finalNullPrices = await eventsCollection.countDocuments({ 
      price: null 
    });
    
    console.log(`   ✅ String prices: ${finalStringPrices}`);
    console.log(`   ❌ Numeric prices: ${finalNumericPrices}`);
    console.log(`   ⚪ Undefined prices: ${finalUndefinedPrices}`);
    console.log(`   ⚪ Null prices: ${finalNullPrices}`);
    
  } catch (error) {
    console.error('❌ Error in urgent price field fix:', error.message);
  } finally {
    await client.close();
    console.log('🔌 MongoDB connection closed.');
  }
}

// Run the urgent fix
urgentFixPriceFields().catch(console.error);
