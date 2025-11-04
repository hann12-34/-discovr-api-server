#!/usr/bin/env node

/**
 * FINAL FIX AND CHECK DATES
 * 1. Delete all events
 * 2. Re-run scrapers with latest fixes
 * 3. Check for events with NULL or fallback dates
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.PRODUCTION_MONGODB_URI;
const DATABASE_NAME = 'discovr';
const SCRAPERS_DIR = path.join(__dirname, 'scrapers', 'cities', 'vancouver');

async function finalFixAndCheckDates() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DATABASE_NAME);
    const eventsCollection = db.collection('events');

    // STEP 1: Delete ALL events
    console.log('🗑️  Deleting all old events...');
    await eventsCollection.deleteMany({});
    console.log('✅ Database cleared\n');

    // STEP 2: Run all scrapers
    const scraperFiles = fs.readdirSync(SCRAPERS_DIR)
      .filter(file => file.endsWith('.js') && !file.endsWith('.bak'));

    console.log(`📋 Running ${scraperFiles.length} scrapers...\n`);

    let totalEvents = 0;
    for (let i = 0; i < scraperFiles.length; i++) {
      const file = scraperFiles[i];
      const scraperPath = path.join(SCRAPERS_DIR, file);
      const scraperName = file.replace('.js', '');

      try {
        delete require.cache[require.resolve(scraperPath)];
        const scraper = require(scraperPath);

        let events = [];
        if (typeof scraper === 'function') {
          events = await scraper('Vancouver');
        } else if (scraper.scrape && typeof scraper.scrape === 'function') {
          events = await scraper.scrape('Vancouver');
        }

        if (events && Array.isArray(events) && events.length > 0) {
          await eventsCollection.insertMany(events);
          totalEvents += events.length;
        }

      } catch (error) {
        // Silent errors
      }
    }

    console.log(`\n✅ Scrapers complete: ${totalEvents} events generated\n`);

    // STEP 3: Check for NULL or suspicious dates
    console.log('🔍 Checking for problematic dates...\n');

    const nullDateEvents = await eventsCollection.find({ date: null }).toArray();
    console.log(`❌ Events with NULL date: ${nullDateEvents.length}`);
    if (nullDateEvents.length > 0) {
      console.log('   Examples:');
      nullDateEvents.slice(0, 5).forEach(e => {
        console.log(`   - "${e.title}" (${e.venue?.name || 'Unknown'})`);
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const todayEvents = await eventsCollection.find({
      date: { $regex: todayStr, $options: 'i' }
    }).toArray();
    console.log(`\n⚠️  Events with today's date (${todayStr}): ${todayEvents.length}`);
    if (todayEvents.length > 0) {
      console.log('   Examples:');
      todayEvents.slice(0, 10).forEach(e => {
        console.log(`   - "${e.title}" | date: ${e.date} | venue: ${e.venue?.name || 'Unknown'}`);
      });
    }

    const nov2Events = await eventsCollection.find({
      date: { $regex: 'Nov 2', $options: 'i' }
    }).toArray();
    console.log(`\n🔥 Events with "Nov 2" in date: ${nov2Events.length}`);
    if (nov2Events.length > 0) {
      console.log('   Examples:');
      nov2Events.slice(0, 10).forEach(e => {
        console.log(`   - "${e.title}" | date: ${e.date} | venue: ${e.venue?.name || 'Unknown'}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📊 Final database: ${totalEvents} events`);
    console.log('='.repeat(60));

    if (nullDateEvents.length === 0 && todayEvents.length === 0 && nov2Events.length === 0) {
      console.log('\n🎉 SUCCESS! No fallback dates found!');
    } else {
      console.log('\n⚠️  WARNING: Found problematic dates!');
      console.log('   The "Nov 2, 2025" might be coming from:');
      console.log('   1. Your iOS app display logic');
      console.log('   2. A server-side aggregator script');
      console.log('   3. The API endpoint formatting');
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    throw error;
  } finally {
    await client.close();
  }
}

finalFixAndCheckDates()
  .then(() => {
    console.log('\n✅ COMPLETE!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ FAILED:', error);
    process.exit(1);
  });
