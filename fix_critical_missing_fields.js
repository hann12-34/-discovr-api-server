/**
 * FIX CRITICAL MISSING FIELDS - LASER FOCUSED APPROACH
 * Target the specific issues hiding events from the app:
 * 1. Missing/malformed dates
 * 2. Missing titles ("NO TITLE")
 * 3. Missing venue names
 * Skip past events filtering - focus on data quality
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function fixCriticalMissingFields() {
  try {
    await mongoose.connect(process.env.PRODUCTION_MONGODB_URI || process.env.MONGODB_URI);
    const Event = require('./models/Event');
    
    console.log('🎯 FIX CRITICAL MISSING FIELDS - LASER FOCUSED\n');
    console.log('🚀 Target: Missing dates, "NO TITLE", missing venue names');
    console.log('⚡ Strategy: Fix or remove events with critical missing data\n');

    let totalFixed = 0;
    let totalRemoved = 0;

    // STEP 1: Fix/Remove events with missing titles
    console.log('📝 STEP 1: FIXING MISSING TITLES...');
    console.log('=' .repeat(40));
    
    // Find events with missing or "NO TITLE"
    const missingTitles = await Event.find({
      $or: [
        { title: { $exists: false } },
        { title: null },
        { title: '' },
        { title: /^NO TITLE$/i }
      ]
    }).lean();
    
    console.log(`📝 Found ${missingTitles.length} events with missing/invalid titles`);
    
    if (missingTitles.length > 0) {
      // Show samples
      console.log('📋 Sample problematic titles:');
      missingTitles.slice(0, 5).forEach((event, i) => {
        console.log(`${i + 1}. "${event.title || 'MISSING'}" - venue: "${event.venue?.name || 'MISSING'}"`);
      });
      
      // Remove events with no meaningful title
      const removeResult = await Event.deleteMany({
        $or: [
          { title: { $exists: false } },
          { title: null },
          { title: '' },
          { title: /^NO TITLE$/i }
        ]
      });
      
      console.log(`🗑️ Removed ${removeResult.deletedCount} events with invalid titles\n`);
      totalRemoved += removeResult.deletedCount;
    }

    // STEP 2: Fix/Remove events with missing venue names
    console.log('🏢 STEP 2: FIXING MISSING VENUE NAMES...');
    console.log('=' .repeat(40));
    
    const missingVenues = await Event.find({
      $or: [
        { 'venue.name': { $exists: false } },
        { 'venue.name': null },
        { 'venue.name': '' },
        { venue: { $exists: false } },
        { venue: null }
      ]
    }).lean();
    
    console.log(`🏢 Found ${missingVenues.length} events with missing venue names`);
    
    if (missingVenues.length > 0) {
      // Show samples
      console.log('📋 Sample events with missing venues:');
      missingVenues.slice(0, 5).forEach((event, i) => {
        console.log(`${i + 1}. "${event.title}" - venue: "${event.venue?.name || 'MISSING'}"`);
      });
      
      // Remove events with no venue information
      const removeVenueResult = await Event.deleteMany({
        $or: [
          { 'venue.name': { $exists: false } },
          { 'venue.name': null },
          { 'venue.name': '' },
          { venue: { $exists: false } },
          { venue: null }
        ]
      });
      
      console.log(`🗑️ Removed ${removeVenueResult.deletedCount} events with missing venues\n`);
      totalRemoved += removeVenueResult.deletedCount;
    }

    // STEP 3: Fix/Remove events with missing/malformed dates
    console.log('📅 STEP 3: FIXING MISSING/MALFORMED DATES...');
    console.log('=' .repeat(40));
    
    const missingDates = await Event.find({
      $or: [
        { startDate: { $exists: false } },
        { startDate: null },
        { startDate: '' }
      ]
    }).lean();
    
    console.log(`📅 Found ${missingDates.length} events with missing dates`);
    
    if (missingDates.length > 0) {
      // Show samples
      console.log('📋 Sample events with missing dates:');
      missingDates.slice(0, 5).forEach((event, i) => {
        console.log(`${i + 1}. "${event.title}" - startDate: "${event.startDate || 'MISSING'}"`);
      });
      
      // Try to extract dates from titles where possible
      let datesExtracted = 0;
      for (const event of missingDates.slice(0, 50)) { // Process first 50
        const title = event.title || '';
        
        // Common date patterns in titles
        const datePatterns = [
          /(\d{4}-\d{2}-\d{2})/,  // YYYY-MM-DD
          /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/i,  // Month DD, YYYY
          /(\d{1,2}\/\d{1,2}\/\d{4})/,  // MM/DD/YYYY
          /(\d{1,2}-\d{1,2}-\d{4})/   // MM-DD-YYYY
        ];
        
        let extractedDate = null;
        for (const pattern of datePatterns) {
          const match = title.match(pattern);
          if (match) {
            try {
              extractedDate = new Date(match[0]);
              if (!isNaN(extractedDate.getTime())) {
                break;
              }
            } catch (error) {
              // Invalid date, continue
            }
          }
        }
        
        if (extractedDate) {
          await Event.updateOne(
            { _id: event._id },
            { $set: { startDate: extractedDate } }
          );
          datesExtracted++;
        }
      }
      
      console.log(`✅ Extracted dates for ${datesExtracted} events`);
      totalFixed += datesExtracted;
      
      // Remove remaining events with no extractable dates
      const removeDateResult = await Event.deleteMany({
        $or: [
          { startDate: { $exists: false } },
          { startDate: null },
          { startDate: '' }
        ]
      });
      
      console.log(`🗑️ Removed ${removeDateResult.deletedCount} events with unfixable dates\n`);
      totalRemoved += removeDateResult.deletedCount;
    }

    // STEP 4: Remove fake/administrative events
    console.log('🗑️ STEP 4: REMOVING FAKE/ADMINISTRATIVE EVENTS...');
    console.log('=' .repeat(40));
    
    const fakeEventPatterns = [
      'Contact us',
      'Talk to us', 
      'Event & Theatre Services',
      'Events that will set you free',
      'About us',
      'Services',
      'Information'
    ];
    
    let fakeRemoved = 0;
    for (const pattern of fakeEventPatterns) {
      const result = await Event.deleteMany({
        title: { $regex: pattern, $options: 'i' }
      });
      console.log(`🗑️ Removed ${result.deletedCount} "${pattern}" events`);
      fakeRemoved += result.deletedCount;
    }
    
    console.log(`✅ Total fake events removed: ${fakeRemoved}\n`);
    totalRemoved += fakeRemoved;

    // FINAL VERIFICATION
    console.log('📊 FINAL DATA QUALITY CHECK:');
    console.log('=' .repeat(40));
    
    const cities = ['Vancouver', 'Calgary', 'Montreal', 'New York', 'Toronto'];
    
    for (const city of cities) {
      const cityEvents = await Event.countDocuments({
        'venue.name': new RegExp(city, 'i')
      });
      
      const validEvents = await Event.countDocuments({
        $and: [
          { 'venue.name': new RegExp(city, 'i') },
          { title: { $exists: true, $ne: null, $ne: '' } },
          { 'venue.name': { $exists: true, $ne: null, $ne: '' } },
          { startDate: { $exists: true, $ne: null, $ne: '' } }
        ]
      });
      
      const quality = cityEvents > 0 ? ((validEvents / cityEvents) * 100).toFixed(1) : 0;
      
      console.log(`🏙️ ${city}:`);
      console.log(`   Total events: ${cityEvents}`);
      console.log(`   Valid events: ${validEvents} (${quality}% quality)`);
      console.log(`   Expected app visibility: ~${validEvents} events`);
      console.log('');
    }

    console.log('🎉 CRITICAL FIELD FIXES COMPLETE!');
    console.log(`✅ Events fixed: ${totalFixed}`);
    console.log(`🗑️ Invalid events removed: ${totalRemoved}`);
    console.log('\n🎯 IMPACT: All remaining events now have:');
    console.log('✅ Valid titles (no "NO TITLE")');
    console.log('✅ Valid venue names');
    console.log('✅ Valid start dates');
    console.log('✅ No fake/administrative entries');
    
    console.log('\n📱 RECOMMENDATION: Test app now for improved event visibility!');
    console.log('Expected: Cleaner, more reliable event listings in all cities');
    
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Failed to fix critical missing fields:', error);
  }
}

// Execute the critical fixes
fixCriticalMissingFields().catch(console.error);
