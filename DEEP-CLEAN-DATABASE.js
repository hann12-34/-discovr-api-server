#!/usr/bin/env node

/**
 * DEEP CLEAN DATABASE
 * Remove duplicates, junk, invalid dates, and short titles
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.PRODUCTION_MONGODB_URI;
const DATABASE_NAME = 'discovr';

async function deepClean() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const eventsCollection = db.collection('events');

    console.log('🧹 DEEP CLEANING DATABASE\n');
    
    const initialCount = await eventsCollection.countDocuments({});
    console.log(`Starting with: ${initialCount} events\n`);

    // 1. Remove junk titles
    console.log('1️⃣  REMOVING JUNK TITLES...');
    const junkPatterns = [
      { title: /^buy tickets?$/i },
      { title: /^more info$/i },
      { title: /^learn more$/i },
      { title: /^view all/i },
      { title: /^show calendar$/i },
      { title: /^events?$/i },
      { title: /^home$/i },
      { title: /^menu$/i },
      { title: /^tickets?$/i },
      { title: /^details$/i },
      { title: /^info$/i },
      { title: /^get this offer$/i },
      { title: /^shows? & tickets$/i },
      { title: /\{fill:/i },
      { title: /^\.a\{/i },
      { title: /evenodd/i },
      { title: /^what's on$/i },
      { title: /^upgrades?$/i }
    ];

    let junkDeleted = 0;
    for (const pattern of junkPatterns) {
      const result = await eventsCollection.deleteMany(pattern);
      junkDeleted += result.deletedCount;
    }
    console.log(`   ✅ Deleted ${junkDeleted} junk events\n`);

    // 2. Remove very short titles (< 10 chars)
    console.log('2️⃣  REMOVING SHORT TITLES (< 10 chars)...');
    const shortResult = await eventsCollection.deleteMany({
      $expr: { $lt: [{ $strLenCP: '$title' }, 10] }
    });
    console.log(`   ✅ Deleted ${shortResult.deletedCount} short-title events\n`);

    // 3. Remove invalid dates
    console.log('3️⃣  REMOVING INVALID DATES...');
    const invalidDates = await eventsCollection.deleteMany({
      $or: [
        { date: '' },
        { date: /^check website/i },
        { date: /^see website/i },
        { date: /^visit website/i },
        { date: /^TBA$/i },
        { date: /^TBD$/i },
        { date: /^ongoing$/i },
        { date: /^date tba$/i },
        { date: /^date tbd$/i }
      ]
    });
    console.log(`   ✅ Deleted ${invalidDates.deletedCount} events with invalid dates\n`);

    // 4. Remove URL duplicates (keep only first)
    console.log('4️⃣  REMOVING URL DUPLICATES...');
    const urlDupes = await eventsCollection.aggregate([
      { $match: { url: { $ne: null, $exists: true } } },
      { $group: { _id: '$url', ids: { $push: '$_id' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();

    let urlDupesDeleted = 0;
    for (const dupe of urlDupes) {
      // Keep first, delete rest
      const toDelete = dupe.ids.slice(1);
      const result = await eventsCollection.deleteMany({ _id: { $in: toDelete } });
      urlDupesDeleted += result.deletedCount;
    }
    console.log(`   ✅ Deleted ${urlDupesDeleted} URL duplicates\n`);

    // 5. Remove exact duplicates (same title + venue + date)
    console.log('5️⃣  REMOVING EXACT DUPLICATES...');
    const duplicates = await eventsCollection.aggregate([
      {
        $group: {
          _id: {
            title: '$title',
            venue: '$venue.name',
            date: '$date'
          },
          ids: { $push: '$_id' },
          count: { $sum: 1 }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();

    let exactDupesDeleted = 0;
    for (const dupe of duplicates) {
      // Keep first, delete rest
      const toDelete = dupe.ids.slice(1);
      const result = await eventsCollection.deleteMany({ _id: { $in: toDelete } });
      exactDupesDeleted += result.deletedCount;
    }
    console.log(`   ✅ Deleted ${exactDupesDeleted} exact duplicates\n`);

    // 6. Normalize city names (Vancouver vs vancouver)
    console.log('6️⃣  NORMALIZING CITY NAMES...');
    await eventsCollection.updateMany(
      { city: 'vancouver' },
      { $set: { city: 'Vancouver' } }
    );
    await eventsCollection.updateMany(
      { city: 'toronto' },
      { $set: { city: 'Toronto' } }
    );
    await eventsCollection.updateMany(
      { city: 'calgary' },
      { $set: { city: 'Calgary' } }
    );
    await eventsCollection.updateMany(
      { city: 'montreal' },
      { $set: { city: 'Montreal' } }
    );
    await eventsCollection.updateMany(
      { city: { $in: [null, '', 'unknown', 'undefined'] } },
      { $set: { city: 'Unknown' } }
    );
    console.log(`   ✅ Normalized city names\n`);

    // 7. Final stats
    const finalCount = await eventsCollection.countDocuments({});
    const totalDeleted = initialCount - finalCount;

    console.log('='.repeat(70));
    console.log('📊 CLEANUP SUMMARY:');
    console.log(`  Started with: ${initialCount} events`);
    console.log(`  Deleted: ${totalDeleted} events`);
    console.log(`  Remaining: ${finalCount} events`);
    console.log('='.repeat(70));

    // Show remaining by city
    console.log('\n📍 EVENTS BY CITY (after cleanup):');
    const cityCounts = await eventsCollection.aggregate([
      { $group: { _id: '$city', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    cityCounts.forEach(c => {
      console.log(`  ${c._id}: ${c.count} events`);
    });

    // Check remaining NULLs
    const remainingNulls = await eventsCollection.countDocuments({ date: null });
    console.log(`\n⚠️  Remaining NULL dates: ${remainingNulls}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

deepClean().then(() => {
  console.log('\n✅ DEEP CLEAN COMPLETE!');
  process.exit(0);
});
