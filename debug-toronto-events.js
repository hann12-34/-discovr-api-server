/**
 * EMERGENCY TORONTO EVENTS DIAGNOSIS
 * 
 * Diagnoses why Toronto events aren't appearing in mobile app filtering
 * despite being imported to database
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://discov...";

async function diagnoseTorontoEvents() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('🔍 EMERGENCY TORONTO EVENTS DIAGNOSIS');
    console.log('='.repeat(60));
    
    const eventsCollection = client.db('events').collection('events');
    
    // Get total event count
    const totalEvents = await eventsCollection.countDocuments({});
    console.log(`📊 Total events in database: ${totalEvents}`);
    
    // Check events with different city patterns
    console.log('\n🏙️ CITY ANALYSIS:');
    
    // Method 1: Check events with "Toronto" in city field
    const torontoCityField = await eventsCollection.countDocuments({
      'venue.city': 'Toronto'
    });
    console.log(`📍 Events with venue.city = 'Toronto': ${torontoCityField}`);
    
    // Method 2: Check events with city field containing Toronto
    const torontoCityContains = await eventsCollection.countDocuments({
      'venue.city': { $regex: /Toronto/i }
    });
    console.log(`📍 Events with venue.city containing 'Toronto': ${torontoCityContains}`);
    
    // Method 3: Check events with city property anywhere
    const cityProperty = await eventsCollection.countDocuments({
      'city': { $regex: /Toronto/i }
    });
    console.log(`📍 Events with city property containing 'Toronto': ${cityProperty}`);
    
    // Method 4: Check events with Toronto in source
    const torontoSource = await eventsCollection.countDocuments({
      'source': { $regex: /Toronto/i }
    });
    console.log(`📍 Events with source containing 'Toronto': ${torontoSource}`);
    
    // Get sample Toronto events to analyze structure
    console.log('\n🔬 SAMPLE TORONTO EVENT ANALYSIS:');
    const sampleEvents = await eventsCollection.find({
      $or: [
        { 'venue.city': { $regex: /Toronto/i } },
        { 'city': { $regex: /Toronto/i } },
        { 'source': { $regex: /Toronto/i } }
      ]
    }).limit(5).toArray();
    
    sampleEvents.forEach((event, index) => {
      console.log(`\n📝 Sample Event ${index + 1}:`);
      console.log(`   Title: ${event.title}`);
      console.log(`   City: ${event.city || 'undefined'}`);
      console.log(`   Venue.city: ${event.venue?.city || 'undefined'}`);
      console.log(`   Source: ${event.source || 'undefined'}`);
      console.log(`   Tags: ${JSON.stringify(event.tags || [])}`);
      console.log(`   ID: ${event.id || event._id}`);
    });
    
    // Check events that might be missing city information
    console.log('\n⚠️ EVENTS MISSING CITY INFO:');
    const missingCityInfo = await eventsCollection.countDocuments({
      $and: [
        { 'venue.city': { $exists: false } },
        { 'city': { $exists: false } }
      ]
    });
    console.log(`📍 Events missing both venue.city and city: ${missingCityInfo}`);
    
    // Check for events with undefined/null city values
    const undefinedCity = await eventsCollection.countDocuments({
      $or: [
        { 'venue.city': null },
        { 'venue.city': undefined },
        { 'venue.city': '' },
        { 'city': null },
        { 'city': undefined }, 
        { 'city': '' }
      ]
    });
    console.log(`📍 Events with undefined/null/empty city: ${undefinedCity}`);
    
    // Look for events from our scrapers specifically
    console.log('\n🚀 SCRAPER SOURCE ANALYSIS:');
    const scraperSources = [
      'MOCA-Toronto',
      'Gardiner Museum-Toronto', 
      'UV Toronto-Toronto',
      'Factory Theatre-Toronto',
      'ROM-Toronto',
      'AGO-Toronto'
    ];
    
    for (const source of scraperSources) {
      const count = await eventsCollection.countDocuments({ source });
      console.log(`📊 ${source}: ${count} events`);
    }
    
    // Check recent events (imported today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const recentEvents = await eventsCollection.countDocuments({
      createdAt: { $gte: today }
    });
    console.log(`\n⏰ Events created today: ${recentEvents}`);
    
    // Final recommendation
    console.log('\n🎯 DIAGNOSIS COMPLETE');
    if (torontoCityField === 0 && cityProperty === 0) {
      console.log('❌ PROBLEM: No events have proper Toronto city tagging!');
      console.log('💡 SOLUTION: Run city tagging fix script for all imported events');
    } else if (torontoCityField > 6) {
      console.log('❌ PROBLEM: Events have city tags but app filtering logic may be broken');
      console.log('💡 SOLUTION: Check mobile app filtering logic and API compatibility');
    } else {
      console.log('⚠️ PROBLEM: Mixed issues - some city tagging problems detected');
    }
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
  } finally {
    await client.close();
  }
}

// Run diagnosis
diagnoseTorontoEvents().catch(console.error);
