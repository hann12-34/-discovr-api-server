#!/usr/bin/env node

/**
 * CLEAN DATABASE - REMOVE EVENTS WITHOUT ID FIELD
 * This fixes the 422 error by removing old events that don't have the required 'id' field
 */

const mongoose = require('mongoose');

// MongoDB connection string from environment or hardcoded
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://seongwoohan:rnsdn200509@cluster0.uuukc.mongodb.net/discovr-db?retryWrites=true&w=majority';

async function cleanDatabase() {
  console.log('🔍 CLEANING DATABASE - REMOVING EVENTS WITHOUT ID FIELD\n');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Define Event model
    const Event = mongoose.model('Event', new mongoose.Schema({}, { strict: false, collection: 'events' }));

    // Find all events
    const allEvents = await Event.find({}).lean();
    console.log(`📊 Total events in database: ${allEvents.length}`);

    // Find events missing 'id' field
    const missingId = allEvents.filter(e => !e.id);
    console.log(`❌ Events missing 'id' field: ${missingId.length}\n`);

    if (missingId.length > 0) {
      console.log('🗑️  Sample events to be deleted:');
      missingId.slice(0, 5).forEach((e, i) => {
        console.log(`  ${i + 1}. "${e.title}" (${e.city || 'NO CITY'})`);
      });

      console.log('\n🔥 DELETING events without id field...');
      
      // Delete events that don't have 'id' field
      const result = await Event.deleteMany({ id: { $exists: false } });
      console.log(`✅ DELETED: ${result.deletedCount} events\n`);

      // Verify
      const remaining = await Event.find({ id: { $exists: false } }).countDocuments();
      if (remaining === 0) {
        console.log('✅✅✅ SUCCESS! All events now have id field!');
      } else {
        console.log(`⚠️  WARNING: ${remaining} events still missing id field`);
      }

      // Show final count
      const finalCount = await Event.countDocuments({});
      console.log(`📊 Final event count: ${finalCount}`);
    } else {
      console.log('✅ All events already have id field - nothing to clean!');
    }

    await mongoose.disconnect();
    console.log('\n✅ Database cleanup complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanDatabase();
