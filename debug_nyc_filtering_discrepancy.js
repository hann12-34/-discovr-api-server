/**
 * Debug New York City Filtering Discrepancy
 * Database shows 199 NYC events but app only shows 4
 * Investigates date filtering, data validation, and app filtering logic
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Event = require('./models/Event');

async function debugNYCDiscrepancy() {
  try {
    console.log('🔍 DEBUGGING NYC FILTERING DISCREPANCY...\n');
    console.log('📊 Expected: 199 NYC events in database');
    console.log('📱 Actual: 4 NYC events visible in app');
    console.log('🎯 Goal: Find what\'s hiding 195 events\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all NYC events from database
    const nycEvents = await Event.find({
      'venue.city': { $regex: /new york/i }
    }).lean();

    console.log(`📊 Total NYC events in database: ${nycEvents.length}\n`);

    if (nycEvents.length === 0) {
      console.log('❌ NO NYC EVENTS FOUND! venue.city fix may not have persisted');
      return;
    }

    // Analyze date ranges of NYC events
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
    const oneYearFromNow = new Date(today.getTime() + (365 * 24 * 60 * 60 * 1000));

    console.log('📅 DATE ANALYSIS:');
    console.log('=' .repeat(50));
    console.log(`🗓️ Today: ${today.toISOString().split('T')[0]}`);
    console.log(`🗓️ 30 days ago: ${thirtyDaysAgo.toISOString().split('T')[0]}`);
    console.log(`🗓️ 30 days from now: ${thirtyDaysFromNow.toISOString().split('T')[0]}`);

    let validDates = 0;
    let invalidDates = 0;
    let futureDates = 0;
    let pastDates = 0;
    let recentEvents = 0;
    let missingDates = 0;

    const dateAnalysis = {
      valid: [],
      invalid: [],
      tooFuture: [],
      tooPast: [],
      recent: [],
      missing: []
    };

    for (const event of nycEvents) {
      const startDate = event.startDate ? new Date(event.startDate) : null;
      
      if (!startDate || isNaN(startDate.getTime())) {
        missingDates++;
        dateAnalysis.missing.push({
          title: event.title,
          startDate: event.startDate,
          id: event._id
        });
      } else if (startDate > oneYearFromNow) {
        futureDates++;
        dateAnalysis.tooFuture.push({
          title: event.title,
          startDate: startDate.toISOString().split('T')[0],
          id: event._id
        });
      } else if (startDate < thirtyDaysAgo) {
        pastDates++;
        dateAnalysis.tooPast.push({
          title: event.title,
          startDate: startDate.toISOString().split('T')[0],
          id: event._id
        });
      } else if (startDate >= thirtyDaysAgo && startDate <= thirtyDaysFromNow) {
        recentEvents++;
        dateAnalysis.recent.push({
          title: event.title,
          startDate: startDate.toISOString().split('T')[0],
          id: event._id
        });
      } else {
        validDates++;
        dateAnalysis.valid.push({
          title: event.title,
          startDate: startDate.toISOString().split('T')[0],
          id: event._id
        });
      }
    }

    console.log(`📊 Events with valid dates (30 days ago - 1 year): ${validDates}`);
    console.log(`📊 Events in next 30 days (most likely to show): ${recentEvents}`);
    console.log(`📊 Events too far in future (>1 year): ${futureDates}`);
    console.log(`📊 Events too far in past (<30 days ago): ${pastDates}`);
    console.log(`📊 Events with missing/invalid dates: ${missingDates}`);

    console.log('\n🎯 LIKELY VISIBLE EVENTS (Recent + Valid):');
    console.log('=' .repeat(50));
    const likelyVisible = recentEvents + validDates;
    console.log(`📈 Expected visible events: ${likelyVisible}`);
    console.log(`📱 Actually visible in app: 4`);
    console.log(`❓ Hidden events: ${likelyVisible - 4}`);

    if (dateAnalysis.recent.length > 0) {
      console.log('\n📅 RECENT EVENTS (Next 30 days):');
      dateAnalysis.recent.slice(0, 10).forEach((event, i) => {
        console.log(`${i + 1}. "${event.title}" - ${event.startDate}`);
      });
    }

    if (dateAnalysis.valid.length > 0) {
      console.log('\n📅 VALID FUTURE EVENTS:');
      dateAnalysis.valid.slice(0, 5).forEach((event, i) => {
        console.log(`${i + 1}. "${event.title}" - ${event.startDate}`);
      });
    }

    // Analyze the 4 visible events by checking specific event data
    console.log('\n🔍 ANALYZING VISIBLE EVENTS...');
    console.log('Looking for events that match the 4 visible ones in the app...');
    
    // Check for events with specific titles from the app screenshots
    const visibleTitles = [
      'new york fashion',
      'paint in central',
      'yacht party',
      'speakeasy'
    ];

    console.log('\n🎯 SEARCHING FOR VISIBLE EVENT MATCHES:');
    for (const searchTitle of visibleTitles) {
      const matches = nycEvents.filter(event => 
        event.title.toLowerCase().includes(searchTitle.toLowerCase())
      );
      
      if (matches.length > 0) {
        console.log(`\n📋 "${searchTitle.toUpperCase()}" MATCHES: ${matches.length}`);
        matches.slice(0, 3).forEach((match, i) => {
          console.log(`${i + 1}. "${match.title}"`);
          console.log(`   Date: ${match.startDate ? new Date(match.startDate).toISOString().split('T')[0] : 'N/A'}`);
          console.log(`   Venue: ${match.venue?.name || 'N/A'}`);
          console.log(`   Venue City: ${match.venue?.city || 'N/A'}`);
          console.log('');
        });
      }
    }

    // Check for missing required fields that might cause filtering
    console.log('\n🔍 DATA VALIDATION CHECK:');
    console.log('=' .repeat(40));
    
    let missingId = 0;
    let missingTitle = 0;
    let missingPrice = 0;
    let missingLocation = 0;
    let missingCategories = 0;
    
    for (const event of nycEvents) {
      if (!event.id) missingId++;
      if (!event.title) missingTitle++;
      if (!event.price) missingPrice++;
      if (!event.location) missingLocation++;
      if (!event.categories || event.categories.length === 0) missingCategories++;
    }

    console.log(`❌ Events missing id: ${missingId}`);
    console.log(`❌ Events missing title: ${missingTitle}`);
    console.log(`❌ Events missing price: ${missingPrice}`);
    console.log(`❌ Events missing location: ${missingLocation}`);
    console.log(`❌ Events missing categories: ${missingCategories}`);

    const fullyValid = nycEvents.length - Math.max(missingId, missingTitle, missingPrice, missingLocation, missingCategories);
    console.log(`✅ Events with all required fields: ${fullyValid}`);

    console.log('\n🏆 SUMMARY:');
    console.log('=' .repeat(30));
    console.log(`📊 Database NYC events: ${nycEvents.length}`);
    console.log(`📅 Date-valid events: ${likelyVisible}`);
    console.log(`✅ Field-valid events: ${fullyValid}`);
    console.log(`📱 App visible events: 4`);
    console.log(`❓ Mystery gap: ${Math.min(likelyVisible, fullyValid) - 4} events`);

    if (Math.min(likelyVisible, fullyValid) - 4 > 100) {
      console.log('\n🚨 MAJOR DISCREPANCY DETECTED!');
      console.log('💡 Possible causes:');
      console.log('   1. App is using different API endpoint');
      console.log('   2. Production server has different data');
      console.log('   3. Additional filtering logic in app');
      console.log('   4. Caching issues');
    }

  } catch (error) {
    console.error('❌ Error debugging NYC discrepancy:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection closed');
  }
}

// Run the discrepancy analysis
debugNYCDiscrepancy().catch(console.error);
