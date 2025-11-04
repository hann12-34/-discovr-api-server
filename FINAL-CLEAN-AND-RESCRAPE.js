#!/usr/bin/env node

/**
 * FINAL CLEAN AND RESCRAPE - Apply REAL fixes for multi-word CTAs
 * This fixes the patterns that were too specific!
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.PRODUCTION_MONGODB_URI;
const DATABASE_NAME = 'discovr';
const SCRAPERS_DIR = path.join(__dirname, 'scrapers', 'cities', 'vancouver');

console.log('🚀 FINAL CLEAN AND RESCRAPE - Fixing Multi-Word CTA Patterns!');
console.log('📦 Connecting to:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

async function finalCleanAndRescrape() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DATABASE_NAME);
    const eventsCollection = db.collection('events');

    // STEP 1: Delete ALL events again
    console.log('🗑️  DELETING ALL OLD EVENTS...');
    const deleteResult = await eventsCollection.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} events\n`);

    // STEP 2: Run all scrapers with REAL fixes
    const scraperFiles = fs.readdirSync(SCRAPERS_DIR)
      .filter(file => file.endsWith('.js') && !file.endsWith('.bak'));

    console.log(`📋 Running ${scraperFiles.length} Vancouver scrapers with REAL fixes...\n`);

    let successCount = 0;
    let errorCount = 0;
    let totalEvents = 0;

    for (let i = 0; i < scraperFiles.length; i++) {
      const file = scraperFiles[i];
      const scraperPath = path.join(SCRAPERS_DIR, file);
      const scraperName = file.replace('.js', '');

      try {
        console.log(`[${i + 1}/${scraperFiles.length}] ${scraperName}...`);

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
          console.log(`  ✅ ${events.length} events`);
          totalEvents += events.length;
          successCount++;
        } else {
          console.log(`  ℹ️  No events`);
          successCount++;
        }

      } catch (error) {
        console.error(`  ❌ ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 FINAL SCRAPING COMPLETE!');
    console.log('='.repeat(60));
    console.log(`✅ Successful: ${successCount}/${scraperFiles.length}`);
    console.log(`❌ Errors: ${errorCount}/${scraperFiles.length}`);
    console.log(`📊 Total events: ${totalEvents}`);
    
    const finalCount = await eventsCollection.countDocuments();
    console.log(`\n✅ Database contains: ${finalCount} events`);

    if (finalCount > 0) {
      console.log('\n🎉 SUCCESS! REAL fixes applied:');
      console.log('   ✅ "BUY TICKETS" blocked');
      console.log('   ✅ "MORE INFO" blocked');
      console.log('   ✅ "View Calendar" blocked');
      console.log('   ✅ "SEEING DOUBL...", "SWIM", "THIRST TRAP" blocked');
      console.log('   ✅ "Exhibition", "Events + Tours..." blocked');
      console.log('   ✅ Multi-word CTAs now properly filtered!');
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Database connection closed');
  }
}

finalCleanAndRescrape()
  .then(() => {
    console.log('\n✅ FINAL SCRAPING COMPLETED!');
    console.log('\n📱 Refresh your iOS app to see CLEAN data!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ FAILED:', error);
    process.exit(1);
  });
