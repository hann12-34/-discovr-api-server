/**
 * 🚨 EMERGENCY FIX: REMOVE INCORRECT CITY TAGS
 * 
 * CRITICAL BUG: The deployment script was adding city names to venue.name
 * based on contaminated location/address fields, making contamination WORSE!
 * 
 * This script:
 * 1. REMOVES all incorrect city tags added by the broken logic
 * 2. Only keeps city tags for events that genuinely belong to that city
 * 3. Uses a much more conservative, safe tagging approach
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function emergencyFixCityTagging() {
  try {
    console.log('🚨 EMERGENCY FIX: CITY TAGGING CONTAMINATION\n');
    console.log('❌ Problem: Script was adding city names based on contaminated fields');
    console.log('✅ Solution: Remove incorrect tags, use safe tagging only\n');

    // Connect to PRODUCTION database
    await mongoose.connect(process.env.PRODUCTION_MONGODB_URI || process.env.MONGODB_URI);
    const Event = require('./models/Event');
    console.log('🔌 Connected to PRODUCTION database\n');

    // STEP 1: Analyze the damage - count potentially incorrect tags
    console.log('📊 STEP 1: ANALYZE CONTAMINATION DAMAGE');
    console.log('=' .repeat(50));
    
    const cities = ['Vancouver', 'Calgary', 'Montreal', 'New York', 'Toronto'];
    const contamination = {};
    
    for (const city of cities) {
      const count = await Event.countDocuments({
        'venue.name': new RegExp(city, 'i')
      });
      contamination[city] = count;
      console.log(`🏙️ Events tagged with "${city}": ${count}`);
    }
    
    // STEP 2: Find events with multiple city names (definitely wrong)
    console.log('\n🔍 STEP 2: FIND DEFINITELY CONTAMINATED EVENTS');
    console.log('=' .repeat(50));
    
    const multiCityEvents = await Event.find({
      'venue.name': {
        $regex: /(Vancouver.*Toronto|Toronto.*Vancouver|Calgary.*Toronto|Toronto.*Calgary|Vancouver.*Calgary|Calgary.*Vancouver|New York.*(Vancouver|Toronto|Calgary)|Montreal.*(Toronto|Vancouver))/i
      }
    }).lean();
    
    console.log(`🚨 Found ${multiCityEvents.length} events with multiple city names`);
    
    if (multiCityEvents.length > 0) {
      console.log('\n📋 Sample multi-city contaminated events:');
      multiCityEvents.slice(0, 5).forEach((event, i) => {
        console.log(`${i + 1}. "${event.title}"`);
        console.log(`   venue.name: "${event.venue?.name}"`);
        console.log('');
      });
    }

    // STEP 3: CONSERVATIVE CLEANUP - Remove obvious contamination
    console.log('🧹 STEP 3: CONSERVATIVE CLEANUP');
    console.log('=' .repeat(50));
    
    let cleanedCount = 0;
    
    // Strategy: For each event with multiple cities, try to determine the REAL city
    // and remove the contaminating city names
    for (const event of multiCityEvents) {
      const venueName = event.venue?.name || '';
      let cleanedVenueName = venueName;
      
      // Remove obvious contamination patterns
      // Only remove city names that appear as suffixes (likely added by our broken script)
      cleanedVenueName = cleanedVenueName
        .replace(/, Toronto$/, '') // Remove trailing ", Toronto"
        .replace(/, Vancouver$/, '') // Remove trailing ", Vancouver"  
        .replace(/, Calgary$/, '') // Remove trailing ", Calgary"
        .replace(/, Montreal$/, '') // Remove trailing ", Montreal"
        .replace(/, New York$/, ''); // Remove trailing ", New York"
      
      // If we cleaned something, update it
      if (cleanedVenueName !== venueName && cleanedVenueName.trim()) {
        await Event.updateOne(
          { _id: event._id },
          { $set: { 'venue.name': cleanedVenueName.trim() } }
        );
        cleanedCount++;
        console.log(`🧹 Cleaned: "${venueName}" → "${cleanedVenueName.trim()}"`);
      }
    }
    
    console.log(`✅ Cleaned ${cleanedCount} obviously contaminated events\n`);

    // STEP 4: SAFE CITY TAGGING - Only add city names we're confident about
    console.log('🎯 STEP 4: SAFE CITY TAGGING (CONSERVATIVE)');
    console.log('=' .repeat(50));
    
    let safeTaggedCount = 0;
    
    // Only add city names to events that:
    // 1. Have NO city name in venue.name currently
    // 2. Have clear, unambiguous indicators of their real city
    
    // Vancouver: Only if venue clearly contains "Vancouver" in name/address
    const vancouverEvents = await Event.find({
      'venue.name': { $not: /Vancouver|Toronto|Calgary|Montreal|New York/i },
      $or: [
        { 'venue.name': /BC Place|Rogers Arena|Queen Elizabeth Theatre|Orpheum|Science World/i },
        { location: /Vancouver, BC/i },
        { address: /Vancouver, BC/i }
      ]
    });
    
    for (const event of vancouverEvents.slice(0, 20)) { // Limit to 20 for safety
      const currentName = event.venue?.name || 'Unknown Venue';
      const newName = `${currentName}, Vancouver`;
      
      await Event.updateOne(
        { _id: event._id },
        { $set: { 'venue.name': newName } }
      );
      safeTaggedCount++;
      console.log(`🏷️ Safe tag: "${currentName}" → "${newName}"`);
    }
    
    console.log(`✅ Safely tagged ${safeTaggedCount} events\n`);

    // STEP 5: Final verification
    console.log('📊 STEP 5: VERIFY CLEANUP RESULTS');
    console.log('=' .repeat(50));
    
    for (const city of cities) {
      const count = await Event.countDocuments({
        'venue.name': new RegExp(city, 'i')
      });
      const change = count - contamination[city];
      const changeStr = change > 0 ? `+${change}` : `${change}`;
      console.log(`🏙️ ${city}: ${count} events (${changeStr})`);
    }
    
    const remainingContamination = await Event.countDocuments({
      'venue.name': {
        $regex: /(Vancouver.*Toronto|Toronto.*Vancouver|Calgary.*Toronto|Toronto.*Calgary|Vancouver.*Calgary|Calgary.*Vancouver|New York.*(Vancouver|Toronto|Calgary)|Montreal.*(Toronto|Vancouver))/i
      }
    });
    
    console.log(`\n🚨 Remaining contaminated events: ${remainingContamination}`);
    
    console.log('\n✅ EMERGENCY CLEANUP COMPLETE!');
    console.log('💡 Next step: Verify app results and apply remaining safe fixes');
    
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Emergency fix failed:', error);
  }
}

// Run the emergency fix
emergencyFixCityTagging().catch(console.error);
