/**
 * COMPREHENSIVE INVESTIGATION: HIDDEN EVENTS ACROSS ALL CITIES
 * Find why database counts don't match app display counts
 * Analyze filtering logic, tagging patterns, and data flow issues
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function investigateAllCitiesHiddenEvents() {
  try {
    await mongoose.connect(process.env.PRODUCTION_MONGODB_URI || process.env.MONGODB_URI);
    const Event = require('./models/Event');
    
    console.log('🔍 COMPREHENSIVE HIDDEN EVENTS INVESTIGATION...\n');
    console.log('🚨 PROBLEM: Major discrepancies between database and app display counts');
    console.log('🎯 GOAL: Find why thousands of events are hidden from users\n');

    // App reported counts (from user's testing)
    const appCounts = {
      'Vancouver': 285,
      'Toronto': 641,
      'Calgary': 425,
      'New York': 587,
      'Montreal': 0  // Assuming based on pattern
    };

    // Step 1: Database reality check for all cities
    console.log('📊 DATABASE VS APP COMPARISON:');
    console.log('=' .repeat(60));
    
    const cities = ['Vancouver', 'Toronto', 'Calgary', 'New York', 'Montreal'];
    const analysis = {};
    
    for (const city of cities) {
      const dbCount = await Event.countDocuments({
        'venue.name': new RegExp(city, 'i')
      });
      
      const appCount = appCounts[city] || 0;
      const difference = dbCount - appCount;
      const hiddenPercent = dbCount > 0 ? ((difference / dbCount) * 100).toFixed(1) : 0;
      
      analysis[city] = {
        database: dbCount,
        app: appCount,
        hidden: difference,
        hiddenPercent: hiddenPercent
      };
      
      const status = difference > 0 ? `${difference} HIDDEN (${hiddenPercent}%)` : 
                     difference < 0 ? `${Math.abs(difference)} EXTRA shown` : 'PERFECT MATCH';
      
      console.log(`🏙️ ${city}:`);
      console.log(`   Database: ${dbCount} events`);
      console.log(`   App shows: ${appCount} events`);
      console.log(`   Status: ${status}`);
      console.log('');
    }

    // Step 2: Investigate filtering patterns causing hiding
    console.log('🔍 FILTERING PATTERN ANALYSIS:');
    console.log('=' .repeat(60));
    
    for (const city of cities) {
      if (analysis[city].hidden > 0) {
        console.log(`\n🚨 ANALYZING ${city.toUpperCase()} HIDDEN EVENTS (${analysis[city].hidden} missing):`);
        console.log('-' .repeat(50));
        
        // Find all events with city name in venue.name
        const allCityEvents = await Event.find({
          'venue.name': new RegExp(city, 'i')
        }).lean();
        
        // Analyze what might be causing app filtering issues
        const patterns = {
          'missing_coordinates': 0,
          'past_events': 0,
          'malformed_dates': 0,
          'missing_required_fields': 0,
          'case_sensitivity': 0,
          'special_characters': 0,
          'long_venue_names': 0,
          'duplicate_events': 0
        };
        
        const currentDate = new Date();
        const seenTitles = new Set();
        
        allCityEvents.forEach(event => {
          // Check for various issues that might cause app filtering problems
          
          // Past events (app might filter these out)
          if (event.startDate && new Date(event.startDate) < currentDate) {
            patterns.past_events++;
          }
          
          // Malformed dates
          if (!event.startDate || isNaN(new Date(event.startDate))) {
            patterns.malformed_dates++;
          }
          
          // Missing required fields
          if (!event.title || !event.venue?.name || !event.startDate) {
            patterns.missing_required_fields++;
          }
          
          // Case sensitivity issues (app might be case sensitive)
          if (event.venue?.name && !event.venue.name.includes(city) && event.venue.name.toLowerCase().includes(city.toLowerCase())) {
            patterns.case_sensitivity++;
          }
          
          // Special characters in venue names
          if (event.venue?.name && /[^\w\s,.-]/.test(event.venue.name)) {
            patterns.special_characters++;
          }
          
          // Very long venue names (might break app display)
          if (event.venue?.name && event.venue.name.length > 100) {
            patterns.long_venue_names++;
          }
          
          // Potential duplicates
          const titleKey = event.title?.toLowerCase().trim();
          if (titleKey && seenTitles.has(titleKey)) {
            patterns.duplicate_events++;
          } else if (titleKey) {
            seenTitles.add(titleKey);
          }
          
          // Missing coordinates (if app requires geo filtering)
          if (!event.coordinates || !event.coordinates.lat || !event.coordinates.lng) {
            patterns.missing_coordinates++;
          }
        });
        
        console.log('📋 Potential filtering issues:');
        Object.entries(patterns).forEach(([issue, count]) => {
          if (count > 0) {
            const percentage = ((count / allCityEvents.length) * 100).toFixed(1);
            console.log(`   ${issue.replace(/_/g, ' ')}: ${count} events (${percentage}%)`);
          }
        });
        
        // Show sample problematic events
        if (patterns.missing_required_fields > 0) {
          console.log('\n📋 Sample events with missing required fields:');
          const problematic = allCityEvents
            .filter(e => !e.title || !e.venue?.name || !e.startDate)
            .slice(0, 3);
          
          problematic.forEach((event, i) => {
            console.log(`${i + 1}. "${event.title || 'NO TITLE'}"`);
            console.log(`   venue.name: "${event.venue?.name || 'MISSING'}"`);
            console.log(`   startDate: "${event.startDate || 'MISSING'}"`);
          });
        }
      }
    }

    // Step 3: Check for cross-city contamination
    console.log('\n🔄 CROSS-CITY CONTAMINATION CHECK:');
    console.log('=' .repeat(60));
    
    for (const city of cities) {
      const contaminated = await Event.find({
        $and: [
          { 'venue.name': new RegExp(city, 'i') },
          {
            'venue.name': {
              $regex: cities.filter(c => c !== city).join('|'),
              $options: 'i'
            }
          }
        ]
      }).limit(5).lean();
      
      if (contaminated.length > 0) {
        console.log(`🚨 ${city} events contaminated with other city names:`);
        contaminated.forEach((event, i) => {
          console.log(`${i + 1}. "${event.title}" - venue: "${event.venue?.name}"`);
        });
        console.log('');
      }
    }

    // Step 4: API response structure analysis
    console.log('🔌 API RESPONSE STRUCTURE ANALYSIS:');
    console.log('=' .repeat(60));
    
    // Sample a few events to check response structure compatibility
    const sampleEvent = await Event.findOne({ 'venue.name': /Vancouver/i }).lean();
    
    if (sampleEvent) {
      console.log('📋 Sample event structure:');
      console.log(`   ID type: ${typeof sampleEvent._id} (${sampleEvent._id})`);
      console.log(`   Title type: ${typeof sampleEvent.title}`);
      console.log(`   StartDate type: ${typeof sampleEvent.startDate}`);
      console.log(`   Venue structure: ${typeof sampleEvent.venue} - ${JSON.stringify(sampleEvent.venue, null, 2).slice(0, 100)}...`);
      console.log(`   Price type: ${typeof sampleEvent.price}`);
      console.log(`   Location type: ${typeof sampleEvent.location}`);
      
      // Check for any null/undefined critical fields
      const criticalFields = ['_id', 'title', 'startDate', 'venue'];
      const missingFields = criticalFields.filter(field => !sampleEvent[field]);
      
      if (missingFields.length > 0) {
        console.log(`🚨 Missing critical fields: ${missingFields.join(', ')}`);
      } else {
        console.log('✅ All critical fields present in sample');
      }
    }

    // Step 5: Date filtering analysis
    console.log('\n📅 DATE FILTERING ANALYSIS:');
    console.log('=' .repeat(60));
    
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    for (const city of cities) {
      const allCityEvents = await Event.countDocuments({
        'venue.name': new RegExp(city, 'i')
      });
      
      const futureEvents = await Event.countDocuments({
        $and: [
          { 'venue.name': new RegExp(city, 'i') },
          { startDate: { $gte: today } }
        ]
      });
      
      const recentPastEvents = await Event.countDocuments({
        $and: [
          { 'venue.name': new RegExp(city, 'i') },
          { startDate: { $gte: thirtyDaysAgo, $lt: today } }
        ]
      });
      
      const oldPastEvents = await Event.countDocuments({
        $and: [
          { 'venue.name': new RegExp(city, 'i') },
          { startDate: { $lt: thirtyDaysAgo } }
        ]
      });
      
      console.log(`📅 ${city} date distribution:`);
      console.log(`   Total events: ${allCityEvents}`);
      console.log(`   Future events: ${futureEvents} (${((futureEvents/allCityEvents)*100).toFixed(1)}%)`);
      console.log(`   Recent past (30d): ${recentPastEvents} (${((recentPastEvents/allCityEvents)*100).toFixed(1)}%)`);
      console.log(`   Old past (>30d): ${oldPastEvents} (${((oldPastEvents/allCityEvents)*100).toFixed(1)}%)`);
      console.log('');
    }

    console.log('🎯 INVESTIGATION COMPLETE!');
    console.log('\n🚨 SUMMARY OF HIDDEN EVENTS CAUSES:');
    console.log('1. Date filtering: App may be filtering out past events');
    console.log('2. Required field validation: App may reject events with missing data');
    console.log('3. Case sensitivity: App may require exact case matching');
    console.log('4. Coordinate filtering: App may require geographic data');
    console.log('5. Cross-city contamination: Events tagged with multiple cities');
    console.log('6. API response limits: App may be truncating large responses');
    console.log('7. Response structure: App may have strict field type requirements');
    
    console.log('\n💡 RECOMMENDED SOLUTIONS:');
    console.log('1. Normalize all venue.name casing and format');
    console.log('2. Ensure all events have required fields populated');
    console.log('3. Add coordinate data to all events');
    console.log('4. Fix cross-city contamination in venue names');
    console.log('5. Investigate app-side filtering logic');
    console.log('6. Test API response structure compatibility');
    
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Investigation failed:', error);
  }
}

// Run the comprehensive investigation
investigateAllCitiesHiddenEvents().catch(console.error);
