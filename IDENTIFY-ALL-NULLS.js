#!/usr/bin/env node

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.PRODUCTION_MONGODB_URI;
const DATABASE_NAME = 'discovr';

async function identifyNulls() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const eventsCollection = db.collection('events');

    console.log('🔍 FINDING NULL DATE EVENTS BY VENUE:\n');

    const nullEvents = await eventsCollection.aggregate([
      { $match: { date: null } },
      { 
        $group: { 
          _id: { venue: '$venue.name', city: '$city' },
          count: { $sum: 1 },
          examples: { $push: { title: '$title', url: '$url' } }
        } 
      },
      { $sort: { count: -1 } }
    ]).toArray();

    nullEvents.forEach(group => {
      console.log('='.repeat(70));
      console.log(`📍 ${group._id.venue || 'Unknown Venue'} (${group._id.city || 'Unknown City'}): ${group.count} NULL dates`);
      console.log('   Examples:');
      group.examples.slice(0, 3).forEach(e => {
        console.log(`   - "${e.title}"`);
        console.log(`     URL: ${e.url}`);
      });
      console.log('');
    });

    console.log('='.repeat(70));
    console.log(`📊 Total: ${nullEvents.reduce((sum, g) => sum + g.count, 0)} NULL dates from ${nullEvents.length} venues\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

identifyNulls().then(() => process.exit(0));
