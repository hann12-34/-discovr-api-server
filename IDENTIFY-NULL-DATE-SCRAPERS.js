#!/usr/bin/env node

/**
 * IDENTIFY NULL DATE SCRAPERS
 * Find which scrapers are generating events with NULL dates
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.PRODUCTION_MONGODB_URI;
const DATABASE_NAME = 'discovr';
const SCRAPERS_DIR = path.join(__dirname, 'scrapers', 'cities', 'vancouver');

async function identifyNullDateScrapers() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DATABASE_NAME);
    const eventsCollection = db.collection('events');

    // Get all events with NULL dates grouped by venue
    const nullDateEvents = await eventsCollection.aggregate([
      { $match: { date: null } },
      { $group: { 
          _id: '$venue.name',
          count: { $sum: 1 },
          examples: { $push: { title: '$title', url: '$url' } }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    console.log('🔍 SCRAPERS GENERATING NULL DATES:\n');
    console.log('='.repeat(70));

    nullDateEvents.forEach(venue => {
      console.log(`\n📍 ${venue._id || 'Unknown Venue'}: ${venue.count} events with NULL dates`);
      console.log('   Examples:');
      venue.examples.slice(0, 3).forEach(event => {
        console.log(`   - "${event.title}"`);
        if (event.url) console.log(`     URL: ${event.url}`);
      });
    });

    console.log('\n' + '='.repeat(70));
    console.log(`\n📊 Total: ${nullDateEvents.reduce((sum, v) => sum + v.count, 0)} events from ${nullDateEvents.length} venues`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.close();
  }
}

identifyNullDateScrapers()
  .then(() => {
    console.log('\n✅ COMPLETE!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ FAILED:', error);
    process.exit(1);
  });
