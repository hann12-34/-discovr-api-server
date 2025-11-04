#!/usr/bin/env node

/**
 * ANALYZE DATABASE QUALITY
 * Check for duplicates, junk titles, and invalid dates
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.PRODUCTION_MONGODB_URI;
const DATABASE_NAME = 'discovr';

async function analyzeQuality() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const eventsCollection = db.collection('events');

    console.log('🔍 ANALYZING DATABASE QUALITY\n');
    console.log('='.repeat(70));

    // 1. Count by city
    console.log('\n📊 EVENTS PER CITY:');
    const cityCounts = await eventsCollection.aggregate([
      { $group: { _id: '$city', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    cityCounts.forEach(c => {
      console.log(`  ${c._id || 'unknown'}: ${c.count} events`);
    });

    // 2. Find duplicates (same title + venue + date)
    console.log('\n🔄 CHECKING FOR DUPLICATES:');
    const duplicates = await eventsCollection.aggregate([
      {
        $group: {
          _id: {
            title: '$title',
            venue: '$venue.name',
            date: '$date'
          },
          count: { $sum: 1 },
          ids: { $push: '$_id' }
        }
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();

    if (duplicates.length > 0) {
      console.log(`  ⚠️  Found ${duplicates.length}+ duplicate groups`);
      duplicates.slice(0, 5).forEach(d => {
        console.log(`    - "${d._id.title}" at ${d._id.venue}: ${d.count} copies`);
      });
    } else {
      console.log('  ✅ No exact duplicates found');
    }

    // 3. Check for junk titles
    console.log('\n🗑️  CHECKING FOR JUNK TITLES:');
    const junkPatterns = [
      /^buy tickets?$/i,
      /^more info$/i,
      /^learn more$/i,
      /^view all/i,
      /^show calendar$/i,
      /^events?$/i,
      /^home$/i,
      /^menu$/i,
      /^tickets?$/i,
      /^details$/i,
      /^info$/i,
      /^get this offer$/i,
      /^shows? & tickets$/i,
      /\{fill:/i,  // CSS junk
      /^\.a\{/i,
      /evenodd/i
    ];

    let junkCount = 0;
    const junkExamples = [];

    for (const pattern of junkPatterns) {
      const count = await eventsCollection.countDocuments({ title: pattern });
      if (count > 0) {
        junkCount += count;
        const example = await eventsCollection.findOne({ title: pattern });
        junkExamples.push({ pattern: pattern.source, count, example: example.title });
      }
    }

    if (junkCount > 0) {
      console.log(`  ⚠️  Found ${junkCount} junk titles`);
      junkExamples.slice(0, 5).forEach(j => {
        console.log(`    - /${j.pattern}/: ${j.count} events (e.g., "${j.example}")`);
      });
    } else {
      console.log('  ✅ No obvious junk titles');
    }

    // 4. Check for very short titles (likely junk)
    console.log('\n📏 CHECKING FOR VERY SHORT TITLES:');
    const shortTitles = await eventsCollection.countDocuments({
      $expr: { $lt: [{ $strLenCP: '$title' }, 10] }
    });
    if (shortTitles > 0) {
      const examples = await eventsCollection.find({
        $expr: { $lt: [{ $strLenCP: '$title' }, 10] }
      }).limit(5).toArray();
      console.log(`  ⚠️  ${shortTitles} events with titles < 10 chars`);
      examples.forEach(e => {
        console.log(`    - "${e.title}" at ${e.venue?.name || 'unknown'}`);
      });
    } else {
      console.log('  ✅ All titles >= 10 chars');
    }

    // 5. Check date formats
    console.log('\n📅 CHECKING DATE QUALITY:');
    const nullDates = await eventsCollection.countDocuments({ date: null });
    const withDates = await eventsCollection.countDocuments({ date: { $ne: null } });
    
    // Sample some dates
    const dateSamples = await eventsCollection.aggregate([
      { $match: { date: { $ne: null } } },
      { $sample: { size: 20 } },
      { $project: { date: 1, city: 1 } }
    ]).toArray();

    console.log(`  Total: ${withDates} with dates, ${nullDates} NULL`);
    console.log('  Sample dates:');
    dateSamples.slice(0, 10).forEach(s => {
      console.log(`    - ${s.city}: "${s.date}"`);
    });

    // 6. Check for URL duplicates (same event scraped from different sources)
    console.log('\n🔗 CHECKING FOR URL DUPLICATES:');
    const urlDupes = await eventsCollection.aggregate([
      { $match: { url: { $ne: null, $exists: true } } },
      { $group: { _id: '$url', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]).toArray();

    if (urlDupes.length > 0) {
      console.log(`  ⚠️  Found ${urlDupes.length}+ URLs appearing multiple times`);
      urlDupes.forEach(d => {
        console.log(`    - ${d._id}: ${d.count} times`);
      });
    } else {
      console.log('  ✅ No URL duplicates');
    }

    // 7. Summary
    console.log('\n' + '='.repeat(70));
    console.log('📋 SUMMARY:');
    console.log(`  Total events: ${await eventsCollection.countDocuments({})}`);
    console.log(`  Potential issues: ${junkCount} junk + ${shortTitles} short titles + ${duplicates.length} duplicate groups`);
    console.log('='.repeat(70));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

analyzeQuality().then(() => process.exit(0));
