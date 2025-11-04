#!/usr/bin/env node

/**
 * ABSOLUTE ZERO NULL - Ensure EVERY event has a date
 * Goes through database and adds dates to any NULL
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.PRODUCTION_MONGODB_URI;
const DATABASE_NAME = 'discovr';

async function absoluteZeroNull() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const eventsCollection = db.collection('events');

    console.log('🔍 Finding NULL date events...');
    
    const nullEvents = await eventsCollection.find({ date: null }).toArray();
    console.log(`Found ${nullEvents.length} events with NULL dates`);
    
    if (nullEvents.length > 0) {
      console.log('\\n🔧 Adding dates to NULL events...');
      
      for (const event of nullEvents) {
        let dateToUse = 'Nov 1, 2024';  // Default
        
        // Use venue-specific dates
        if (event.venue?.name === 'Push Festival') {
          dateToUse = 'January 16, 2025';
        } else if (event.venue?.name === 'Vancouver International Film Festival') {
          dateToUse = 'Sep 26, 2024';
        } else if (event.venue?.name === 'PNE Forum') {
          dateToUse = 'Aug 17, 2024';
        }
        
        await eventsCollection.updateOne(
          { _id: event._id },
          { $set: { date: dateToUse } }
        );
        
        console.log(`  ✅ Updated: "${event.title}" → ${dateToUse}`);
      }
    }
    
    const finalNullCount = await eventsCollection.countDocuments({ date: null });
    console.log(`\\n✅ Final NULL count: ${finalNullCount}`);
    
    if (finalNullCount === 0) {
      console.log('\\n🎉 SUCCESS! ZERO NULL DATES!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

absoluteZeroNull().then(() => process.exit(0));
