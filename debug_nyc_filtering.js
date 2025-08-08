/**
 * Debug New York City Filtering Issue
 * Investigates why New York events are showing as 0 despite normalization
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Event = require('./models/Event');

async function debugNYCFiltering() {
  try {
    console.log('🔍 DEBUGGING NEW YORK CITY FILTERING ISSUE...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get ALL events from database
    const allEvents = await Event.find({}).lean();
    console.log(`📊 Total events in database: ${allEvents.length}\n`);

    // Search for events that should match "New York" in various ways
    const searchTerms = [
      'new york',
      'newyork', 
      'nyc',
      'manhattan',
      'brooklyn',
      'queens',
      'bronx',
      'staten island'
    ];

    console.log('🔍 SEARCHING FOR NEW YORK VARIANTS IN EVENT DATA...\n');

    const nycMatches = {
      location: [],
      venueName: [],
      venueAddress: [],
      venueCity: [],
      title: [],
      description: []
    };

    let totalNYCEvents = 0;
    const uniqueEvents = new Set();

    for (const event of allEvents) {
      const location = (event.location || '').toLowerCase();
      const venueName = (event.venue?.name || '').toLowerCase();
      const venueAddress = (event.venue?.address || '').toLowerCase();
      const venueCity = (event.venue?.city || '').toLowerCase();
      const title = (event.title || '').toLowerCase();
      const description = (event.description || '').toLowerCase();

      let hasNYCMatch = false;

      for (const term of searchTerms) {
        if (location.includes(term)) {
          nycMatches.location.push({
            eventId: event._id,
            title: event.title,
            location: event.location,
            matchedTerm: term
          });
          hasNYCMatch = true;
        }
        
        if (venueName.includes(term)) {
          nycMatches.venueName.push({
            eventId: event._id,
            title: event.title,
            venueName: event.venue?.name,
            matchedTerm: term
          });
          hasNYCMatch = true;
        }
        
        if (venueAddress.includes(term)) {
          nycMatches.venueAddress.push({
            eventId: event._id,
            title: event.title,
            venueAddress: event.venue?.address,
            matchedTerm: term
          });
          hasNYCMatch = true;
        }
        
        if (venueCity.includes(term)) {
          nycMatches.venueCity.push({
            eventId: event._id,
            title: event.title,
            venueCity: event.venue?.city,
            matchedTerm: term
          });
          hasNYCMatch = true;
        }
        
        if (title.includes(term)) {
          nycMatches.title.push({
            eventId: event._id,
            title: event.title,
            matchedTerm: term
          });
          hasNYCMatch = true;
        }
        
        if (description.includes(term)) {
          nycMatches.description.push({
            eventId: event._id,
            title: event.title,
            description: event.description?.substring(0, 100) + '...',
            matchedTerm: term
          });
          hasNYCMatch = true;
        }
      }

      if (hasNYCMatch) {
        uniqueEvents.add(event._id);
        totalNYCEvents++;
      }
    }

    console.log('📊 NEW YORK EVENT ANALYSIS RESULTS:');
    console.log('=' .repeat(60));
    console.log(`🎯 Total unique NYC events found: ${uniqueEvents.size}`);
    console.log(`📍 Events with NYC in location: ${nycMatches.location.length}`);
    console.log(`🏢 Events with NYC in venue name: ${nycMatches.venueName.length}`);
    console.log(`📍 Events with NYC in venue address: ${nycMatches.venueAddress.length}`);
    console.log(`🏙️ Events with NYC in venue city: ${nycMatches.venueCity.length}`);
    console.log(`📝 Events with NYC in title: ${nycMatches.title.length}`);
    console.log(`📖 Events with NYC in description: ${nycMatches.description.length}`);

    console.log('\n🔍 SAMPLE NYC EVENTS BY FIELD:');
    console.log('=' .repeat(50));

    if (nycMatches.location.length > 0) {
      console.log('\n📍 LOCATION MATCHES:');
      nycMatches.location.slice(0, 5).forEach((match, i) => {
        console.log(`${i + 1}. "${match.title}"`);
        console.log(`   Location: "${match.location}"`);
        console.log(`   Matched: "${match.matchedTerm}"`);
        console.log('');
      });
    }

    if (nycMatches.venueCity.length > 0) {
      console.log('\n🏙️ VENUE CITY MATCHES:');
      nycMatches.venueCity.slice(0, 5).forEach((match, i) => {
        console.log(`${i + 1}. "${match.title}"`);
        console.log(`   Venue City: "${match.venueCity}"`);
        console.log(`   Matched: "${match.matchedTerm}"`);
        console.log('');
      });
    }

    if (nycMatches.venueAddress.length > 0) {
      console.log('\n📍 VENUE ADDRESS MATCHES:');
      nycMatches.venueAddress.slice(0, 5).forEach((match, i) => {
        console.log(`${i + 1}. "${match.title}"`);
        console.log(`   Venue Address: "${match.venueAddress}"`);
        console.log(`   Matched: "${match.matchedTerm}"`);
        console.log('');
      });
    }

    // Now let's specifically check for exact "New York" matches (case-insensitive)
    console.log('\n🎯 EXACT "NEW YORK" MATCHES:');
    console.log('=' .repeat(40));

    const exactNYMatches = allEvents.filter(event => {
      const location = (event.location || '').toLowerCase();
      const venueName = (event.venue?.name || '').toLowerCase();
      const venueAddress = (event.venue?.address || '').toLowerCase();
      const venueCity = (event.venue?.city || '').toLowerCase();
      
      return location.includes('new york') || 
             venueName.includes('new york') || 
             venueAddress.includes('new york') || 
             venueCity.includes('new york');
    });

    console.log(`🏆 Events with exact "New York" match: ${exactNYMatches.length}`);

    if (exactNYMatches.length > 0) {
      console.log('\n📋 SAMPLE "NEW YORK" EVENTS:');
      exactNYMatches.slice(0, 10).forEach((event, i) => {
        console.log(`${i + 1}. "${event.title}"`);
        console.log(`   Location: "${event.location || 'N/A'}"`);
        console.log(`   Venue: ${event.venue?.name || 'N/A'}`);
        console.log(`   Venue City: ${event.venue?.city || 'N/A'}`);
        console.log(`   Venue Address: ${event.venue?.address || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('❌ NO EVENTS WITH EXACT "NEW YORK" MATCH FOUND!');
      console.log('🚨 This explains why city filtering is failing!');
    }

    console.log('\n🔍 INVESTIGATING APP CITY FILTERING LOGIC...');
    console.log('🎯 The app likely filters by exact city name matches');
    console.log('💡 If no events contain "New York" exactly, filtering will return 0 results');

  } catch (error) {
    console.error('❌ Error debugging NYC filtering:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection closed');
  }
}

// Run the debug analysis
debugNYCFiltering().catch(console.error);
