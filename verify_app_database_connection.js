/**
 * VERIFY APP DATABASE CONNECTION
 * Critical: App results unchanged despite database fixes
 * This means app might be using different database/API endpoint
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function verifyAppDatabaseConnection() {
  try {
    console.log('🚨 CRITICAL DATABASE CONNECTION VERIFICATION\n');
    console.log('❓ Problem: App results UNCHANGED despite database fixes');
    console.log('🎯 Theory: App using different database/API than our fixes\n');

    // Connect to our database
    await mongoose.connect(process.env.PRODUCTION_MONGODB_URI || process.env.MONGODB_URI);
    const Event = require('./models/Event');
    
    console.log('📊 STEP 1: VERIFY OUR DATABASE STATE');
    console.log('=' .repeat(50));
    
    const totalEvents = await Event.countDocuments({});
    console.log(`📊 Total events in our database: ${totalEvents}`);
    
    const cities = ['Vancouver', 'Calgary', 'Montreal', 'New York', 'Toronto'];
    for (const city of cities) {
      const count = await Event.countDocuments({
        'venue.name': new RegExp(city, 'i')
      });
      console.log(`🏙️ ${city}: ${count} events in our database`);
    }

    console.log('\n🌍 STEP 2: CHECK COORDINATE STATUS');
    console.log('=' .repeat(50));
    
    const eventsWithCoords = await Event.countDocuments({
      'coordinates.lat': { $exists: true, $ne: null },
      'coordinates.lng': { $exists: true, $ne: null }
    });
    const eventsWithoutCoords = await Event.countDocuments({
      $or: [
        { 'coordinates.lat': { $exists: false } },
        { 'coordinates.lat': null },
        { 'coordinates.lng': { $exists: false } },
        { 'coordinates.lng': null }
      ]
    });
    
    console.log(`✅ Events WITH coordinates: ${eventsWithCoords}`);
    console.log(`❌ Events WITHOUT coordinates: ${eventsWithoutCoords}`);
    console.log(`📊 Total accounted: ${eventsWithCoords + eventsWithoutCoords}`);

    console.log('\n🔍 STEP 3: CHECK FOR CLEANED DATA');
    console.log('=' .repeat(50));
    
    const eventsWithMissingTitle = await Event.countDocuments({
      $or: [
        { title: 'MISSING' },
        { title: 'NO TITLE' },
        { title: { $exists: false } },
        { title: null },
        { title: '' }
      ]
    });
    
    const eventsWithMissingDates = await Event.countDocuments({
      $or: [
        { startDate: 'MISSING' },
        { startDate: { $exists: false } },
        { startDate: null },
        { startDate: '' }
      ]
    });
    
    console.log(`📝 Events with missing/invalid titles: ${eventsWithMissingTitle}`);
    console.log(`📅 Events with missing dates: ${eventsWithMissingDates}`);
    
    if (eventsWithMissingTitle === 0 && eventsWithMissingDates === 0) {
      console.log('✅ Database cleanup appears successful!');
    } else {
      console.log('❌ Database still has missing data!');
    }

    console.log('\n🌐 STEP 4: CHECK API ENDPOINT CONFIGURATION');
    console.log('=' .repeat(50));
    
    console.log('🔍 Environment variables:');
    console.log(`MONGODB_URI: ${process.env.MONGODB_URI ? 'SET' : 'NOT SET'}`);
    console.log(`PRODUCTION_MONGODB_URI: ${process.env.PRODUCTION_MONGODB_URI ? 'SET' : 'NOT SET'}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}`);
    
    console.log('\n🔍 Connection string being used:');
    console.log(mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Not connected');
    console.log(`Database name: ${mongoose.connection.db?.databaseName || 'Unknown'}`);

    console.log('\n🎯 STEP 5: SAMPLE RECENT EVENT TO VERIFY');
    console.log('=' .repeat(50));
    
    const sampleEvent = await Event.findOne({
      'venue.name': /Vancouver/i
    }).lean();
    
    if (sampleEvent) {
      console.log('📋 Sample Vancouver event from our database:');
      console.log(`   Title: "${sampleEvent.title}"`);
      console.log(`   Venue: "${sampleEvent.venue?.name}"`);
      console.log(`   Location: "${sampleEvent.location}"`);
      console.log(`   Coordinates: ${sampleEvent.coordinates?.lat ? `${sampleEvent.coordinates.lat}, ${sampleEvent.coordinates.lng}` : 'MISSING'}`);
      console.log(`   Start Date: ${sampleEvent.startDate || 'MISSING'}`);
    }

    console.log('\n🚨 CRITICAL QUESTIONS TO INVESTIGATE:');
    console.log('=' .repeat(50));
    console.log('1. Is the app hitting the same API endpoint as our server?');
    console.log('2. Is the production API using the same database we fixed?');
    console.log('3. Is there caching preventing updates from being seen?');
    console.log('4. Is the app using a different environment/config?');
    console.log('5. Are our fixes actually being deployed to production?');
    
    console.log('\n💡 NEXT STEPS:');
    console.log('1. Verify the app\'s API endpoint configuration');
    console.log('2. Check if production server is using correct database');
    console.log('3. Restart production server to clear any caching');
    console.log('4. Verify deployment status on Render.com');
    
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Run the verification
verifyAppDatabaseConnection().catch(console.error);
