#!/usr/bin/env node

/**
 * DIRECT DATABASE CLEANUP FOR NEW YORK
 * 
 * This script:
 * 1. Connects to MongoDB
 * 2. Deletes all New York events
 * 3. Runs clean scrapers
 * 4. Saves clean events to database
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('./models/Event');

async function cleanNewYork() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Step 1: Count current NY events
    const currentCount = await Event.countDocuments({ city: 'New York' });
    console.log(`📊 Current NY events in database: ${currentCount}`);
    
    // Check sample of what's there
    const sample = await Event.find({ city: 'New York', date: '2025-11-06' })
      .limit(10)
      .select('title date');
    console.log(`\n📌 Sample Nov 6 events BEFORE cleanup:`);
    sample.forEach(e => console.log(`   - ${e.title}`));
    
    // Step 2: Delete all NY events
    console.log(`\n🗑️  Deleting ${currentCount} old NY events...`);
    const deleteResult = await Event.deleteMany({ city: 'New York' });
    console.log(`✅ Deleted ${deleteResult.deletedCount} events`);
    
    // Step 3: Run scrapers
    console.log('\n🔄 Running clean NY scrapers...');
    const scrapeNY = require('./scrapers/cities/New York/index.js');
    const cleanEvents = await scrapeNY();
    console.log(`✅ Scraped ${cleanEvents.length} CLEAN events`);
    
    // Count Nov 6 events in scraped data
    const nov6Clean = cleanEvents.filter(e => e.date === '2025-11-06');
    console.log(`   - Nov 6, 2025: ${nov6Clean.length} events`);
    console.log(`\n📌 Nov 6 events in CLEAN scraped data:`);
    nov6Clean.forEach(e => console.log(`   - ${e.title}`));
    
    // Step 4: Save clean events to database
    console.log(`\n💾 Saving ${cleanEvents.length} clean events to database...`);
    let savedCount = 0;
    const errors = [];
    
    for (const event of cleanEvents) {
      try {
        // Create event document with proper schema mapping
        const eventDoc = {
          id: event.id || `ny-${event.title}-${event.date}`.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase(),
          title: event.title,
          name: event.title, // Some schemas use 'name' instead of 'title'
          startDate: event.date ? new Date(event.date) : new Date(), // Convert string date to Date object
          date: event.date,
          city: event.city,
          venue: event.venue,
          sourceURL: event.url,
          url: event.url,
          categories: event.categories || [],
          status: 'active'
        };
        
        const newEvent = new Event(eventDoc);
        await newEvent.save();
        savedCount++;
        
        if (savedCount % 50 === 0) {
          console.log(`   Saved ${savedCount}/${cleanEvents.length}...`);
        }
      } catch (err) {
        errors.push({ title: event.title, error: err.message });
      }
    }
    
    console.log(`✅ Saved ${savedCount} clean events`);
    
    if (errors.length > 0) {
      console.log(`\n⚠️  ${errors.length} errors (showing first 5):`);
      errors.slice(0, 5).forEach(e => console.log(`   - ${e.title}: ${e.error}`));
    }
    
    // Step 5: Verify
    const finalCount = await Event.countDocuments({ city: 'New York' });
    const finalNov6 = await Event.countDocuments({ city: 'New York', date: '2025-11-06' });
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DATABASE CLEANUP COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   BEFORE: ${currentCount} events (with junk)`);
    console.log(`   AFTER:  ${finalCount} events (clean)`);
    console.log(`   Nov 6:  ${finalNov6} events (was ~35, now should be ~10)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎉 Your iOS app will now show CLEAN data!');
    console.log('   Force quit and restart the app to see changes.\n');
    
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

cleanNewYork();
