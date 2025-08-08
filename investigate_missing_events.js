/**
 * INVESTIGATE MISSING EVENTS IN CITY FILTERING
 * Find out where 2,319 events are disappearing!
 * Expected: 3,429 → Should show much more than 192 for NYC
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function investigateMissingEvents() {
  try {
    await mongoose.connect(process.env.PRODUCTION_MONGODB_URI || process.env.MONGODB_URI);
    const Event = require('./models/Event');
    
    console.log('🔍 INVESTIGATING MISSING EVENTS IN CITY FILTERING...\n');
    console.log('🚨 PROBLEM: Only 192 NYC events from 2,511 total (2,319 missing!)');
    console.log('🎯 GOAL: Find where those 2,319 events are hiding\n');

    // Step 1: Total event breakdown
    const totalEvents = await Event.countDocuments({});
    console.log(`📊 TOTAL EVENTS IN DATABASE: ${totalEvents}`);
    
    // Step 2: Analyze venue.name patterns
    console.log('\n🏢 VENUE.NAME ANALYSIS:');
    console.log('=' .repeat(50));
    
    const eventsWithVenueName = await Event.countDocuments({
      'venue.name': { $exists: true, $ne: null, $ne: '' }
    });
    const eventsWithoutVenueName = totalEvents - eventsWithVenueName;
    
    console.log(`✅ Events WITH venue.name: ${eventsWithVenueName}`);
    console.log(`❌ Events WITHOUT venue.name: ${eventsWithoutVenueName}`);
    console.log(`📈 venue.name coverage: ${((eventsWithVenueName/totalEvents)*100).toFixed(1)}%`);

    // Step 3: City distribution analysis
    console.log('\n🏙️ CITY DISTRIBUTION ANALYSIS:');
    console.log('=' .repeat(50));
    
    // Find events that contain each city name in venue.name
    const cities = ['New York', 'Vancouver', 'Calgary', 'Montreal', 'Toronto'];
    const cityBreakdown = {};
    
    for (const city of cities) {
      const count = await Event.countDocuments({
        'venue.name': { $regex: city, $options: 'i' }
      });
      cityBreakdown[city] = count;
      console.log(`🏙️ ${city}: ${count} events`);
    }
    
    const totalCityEvents = Object.values(cityBreakdown).reduce((sum, count) => sum + count, 0);
    const uncategorizedEvents = totalEvents - totalCityEvents;
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`✅ Events with city in venue.name: ${totalCityEvents}`);
    console.log(`❌ Events WITHOUT city in venue.name: ${uncategorizedEvents}`);
    console.log(`📈 City coverage: ${((totalCityEvents/totalEvents)*100).toFixed(1)}%`);

    // Step 4: Sample uncategorized events
    if (uncategorizedEvents > 0) {
      console.log('\n🔍 SAMPLE UNCATEGORIZED EVENTS:');
      console.log('=' .repeat(50));
      
      const sampleUncategorized = await Event.find({
        $and: [
          { 'venue.name': { $not: { $regex: 'New York|Vancouver|Calgary|Montreal|Toronto', $options: 'i' } } },
          { 'venue.name': { $exists: true, $ne: null, $ne: '' } }
        ]
      }).limit(10).lean();
      
      sampleUncategorized.forEach((event, i) => {
        console.log(`${i + 1}. "${event.title}"`);
        console.log(`   venue.name: "${event.venue?.name || 'MISSING'}"`);
        console.log(`   location: "${event.location || 'MISSING'}"`);
        console.log(`   scraper: "${event.scraper || event.source || 'UNKNOWN'}"`);
        console.log('');
      });
    }

    // Step 5: Analyze app filtering logic mismatch
    console.log('\n🔍 APP FILTERING LOGIC ANALYSIS:');
    console.log('=' .repeat(50));
    
    // Test exact NYC filtering patterns the app might use
    const nycPatterns = [
      'New York',
      'NYC', 
      'Manhattan',
      'Brooklyn',
      'Queens',
      'Bronx',
      'Staten Island'
    ];
    
    console.log('🗽 NYC PATTERN MATCHING:');
    for (const pattern of nycPatterns) {
      const count = await Event.countDocuments({
        'venue.name': { $regex: pattern, $options: 'i' }
      });
      console.log(`   "${pattern}": ${count} events`);
    }
    
    // Step 6: Check if app uses different filtering logic
    console.log('\n🤔 POSSIBLE APP FILTERING ISSUES:');
    console.log('=' .repeat(50));
    
    // Check if app filters by venue.city instead of venue.name
    const venueCity = await Event.find({
      'venue.city': { $exists: true, $ne: null, $ne: '' }
    }).limit(5).lean();
    
    if (venueCity.length > 0) {
      console.log('🚨 FOUND: Some events have venue.city field!');
      venueCity.forEach((event, i) => {
        console.log(`${i + 1}. venue.city: "${event.venue.city}" vs venue.name: "${event.venue.name}"`);
      });
      
      const venueCityNYC = await Event.countDocuments({
        'venue.city': { $regex: 'New York', $options: 'i' }
      });
      console.log(`🗽 Events with venue.city = "New York": ${venueCityNYC}`);
    } else {
      console.log('✅ No events found with venue.city field');
    }
    
    // Step 7: Check scraper folder distribution
    console.log('\n📁 SCRAPER FOLDER DISTRIBUTION:');
    console.log('=' .repeat(50));
    
    const scraperSources = await Event.aggregate([
      { $group: { _id: '$scraper', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    console.log('🔧 TOP SCRAPER SOURCES:');
    scraperSources.forEach((source, i) => {
      const scraperName = source._id || 'Unknown';
      console.log(`${i + 1}. ${scraperName}: ${source.count} events`);
    });

    console.log('\n🎯 INVESTIGATION COMPLETE!');
    console.log('\n🚨 LIKELY CAUSES OF MISSING EVENTS:');
    console.log('1. Events from non-focus cities (other than our 5 cities)');
    console.log('2. App using different filtering logic than venue.name');
    console.log('3. Incomplete city tagging in venue.name');
    console.log('4. App case-sensitivity or exact match requirements');
    console.log('5. Events without proper venue structure');
    
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Investigation failed:', error);
  }
}

// Run the investigation
investigateMissingEvents().catch(console.error);
