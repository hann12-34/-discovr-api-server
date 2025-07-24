/**
 * Script to identify and fix events with incorrect price field format
 * The Swift app expects price to be a string, but found a dictionary instead
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

// MongoDB connection URI from environment variables
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function findAndFixPriceFields() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db();
    const events = database.collection('events');
    
    // Find all events where price is an object instead of string
    const problemEvents = await events.find({
      price: { $type: 'object' }
    }).toArray();
    
    console.log(`🔍 Found ${problemEvents.length} events with object price fields`);
    
    if (problemEvents.length === 0) {
      console.log('⚠️ No events found with object price fields. Checking specific index 509...');
      
      // Get all events and check index 509 specifically
      const allEvents = await events.find({}).toArray();
      if (allEvents.length > 509) {
        const specificEvent = allEvents[509];
        console.log(`📊 Examining event at index 509: "${specificEvent.title}" (ID: ${specificEvent._id})`);
        console.log(`📊 Price field type: ${typeof specificEvent.price}`);
        console.log(`📊 Price field value:`, specificEvent.price);
        
        if (typeof specificEvent.price === 'object' && specificEvent.price !== null) {
          await fixPriceField(events, specificEvent);
        } else {
          console.log('⚠️ Event at index 509 does not have an object price field. Checking all events...');
          
          // Look for any events with potential price objects
          for (let i = 0; i < allEvents.length; i++) {
            const event = allEvents[i];
            if (typeof event.price === 'object' && event.price !== null) {
              console.log(`🔍 Found problem event at index ${i}: "${event.title}" (ID: ${event._id})`);
              await fixPriceField(events, event);
            }
          }
        }
      } else {
        console.log(`⚠️ Total events count is ${allEvents.length}, which is less than 510.`);
      }
    } else {
      // Fix all problem events
      for (const event of problemEvents) {
        await fixPriceField(events, event);
      }
    }
    
    console.log('✅ Price field check and fix completed');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
}

async function fixPriceField(collection, event) {
  try {
    console.log(`🔧 Fixing price field for event: "${event.title}" (ID: ${event._id})`);
    console.log(`🔧 Original price field:`, event.price);
    
    let newPriceValue = '';
    
    // Convert price object to string based on its structure
    if (event.price) {
      if (typeof event.price === 'object') {
        // Handle different possible object structures
        if (event.price.value !== undefined) {
          newPriceValue = String(event.price.value);
        } else if (event.price.min !== undefined && event.price.max !== undefined) {
          newPriceValue = `${event.price.min}-${event.price.max}`;
        } else if (event.price.base !== undefined) {
          newPriceValue = String(event.price.base);
        } else if (event.price.adult !== undefined) {
          newPriceValue = `Adult: ${event.price.adult}`;
          if (event.price.child !== undefined) {
            newPriceValue += `, Child: ${event.price.child}`;
          }
          if (event.price.senior !== undefined) {
            newPriceValue += `, Senior: ${event.price.senior}`;
          }
        } else if (Array.isArray(event.price)) {
          newPriceValue = event.price.join(', ');
        } else {
          // Create a string representation of the object
          newPriceValue = JSON.stringify(event.price);
        }
      } else {
        newPriceValue = String(event.price);
      }
    }
    
    console.log(`🔧 New price value: "${newPriceValue}"`);
    
    // Update the event with the string price
    const result = await collection.updateOne(
      { _id: event._id },
      { $set: { price: newPriceValue } }
    );
    
    console.log(`✅ Updated event: ${result.modifiedCount} document(s) modified`);
    
  } catch (error) {
    console.error(`❌ Error fixing event ${event._id}:`, error);
  }
}

// Run the script
findAndFixPriceFields().catch(console.error);
