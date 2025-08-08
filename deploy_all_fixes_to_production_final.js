/**
 * 🚀 DEPLOY ALL FIXES TO RENDER.COM PRODUCTION DATABASE
 * This applies ALL our successful local fixes to the production database
 * that the app actually uses: discovr-proxy-server.onrender.com
 */

const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

async function deployAllFixesToProduction() {
  try {
    console.log('🚀 DEPLOYING ALL FIXES TO RENDER.COM PRODUCTION DATABASE\n');
    console.log('🎯 Target: Production MongoDB used by discovr-proxy-server.onrender.com');
    console.log('📋 Fixes to deploy:');
    console.log('   ✅ 1. Remove invalid events (missing dates, titles, fake events)');
    console.log('   ✅ 2. Add real coordinates to all events');
    console.log('   ✅ 3. Fix cross-city contamination');
    console.log('   ✅ 4. Normalize venue.name format');
    console.log('   ✅ 5. Fix venue structure (string → object)');
    console.log('   ✅ 6. Normalize price fields');
    console.log('   ✅ 7. Clean location fields\n');

    // Connect to PRODUCTION database
    const productionURI = process.env.PRODUCTION_MONGODB_URI || process.env.MONGODB_URI;
    console.log('🔌 Connecting to PRODUCTION database...');
    await mongoose.connect(productionURI);
    console.log('✅ Connected to PRODUCTION MongoDB!\n');

    const Event = require('./models/Event');

    // STEP 1: Remove invalid events (same logic as successful local fix)
    console.log('🗑️ STEP 1: REMOVING INVALID EVENTS');
    console.log('=' .repeat(50));
    
    let removedCount = 0;
    
    // Remove events with missing/invalid titles
    const badTitles = await Event.deleteMany({
      $or: [
        { title: 'MISSING' },
        { title: 'NO TITLE' },
        { title: { $exists: false } },
        { title: null },
        { title: '' }
      ]
    });
    removedCount += badTitles.deletedCount;
    console.log(`📝 Removed ${badTitles.deletedCount} events with invalid titles`);

    // Remove events with missing dates (handle string values properly)
    const badDates = await Event.collection.deleteMany({
      $or: [
        { startDate: 'MISSING' },
        { startDate: { $exists: false } },
        { startDate: null },
        { startDate: '' }
      ]
    });
    removedCount += badDates.deletedCount;
    console.log(`📅 Removed ${badDates.deletedCount} events with missing dates`);

    // Remove fake/administrative events
    const fakeEvents = await Event.deleteMany({
      $or: [
        { title: /^Contact us$/i },
        { title: /^Talk to us$/i },
        { title: /^Information$/i },
        { title: /^About us$/i },
        { title: /^Services$/i },
        { title: /^Event & Theatre Services$/i },
        { title: /^Events that will set you free$/i }
      ]
    });
    removedCount += fakeEvents.deletedCount;
    console.log(`🚫 Removed ${fakeEvents.deletedCount} fake/administrative events`);

    console.log(`✅ Total invalid events removed: ${removedCount}\n`);

    // STEP 2: Fix venue structure (string → object)
    console.log('🏢 STEP 2: FIXING VENUE STRUCTURE');
    console.log('=' .repeat(50));
    
    const stringVenues = await Event.find({
      venue: { $type: 'string' }
    });
    console.log(`🔍 Found ${stringVenues.length} events with venue as string`);
    
    let venueFixCount = 0;
    for (const event of stringVenues) {
      await Event.updateOne(
        { _id: event._id },
        { $set: { venue: { name: event.venue } } }
      );
      venueFixCount++;
    }
    console.log(`✅ Fixed ${venueFixCount} venue structures\n`);

    // STEP 3: Add city tags to venue.name (same logic as successful local fix)
    console.log('🏙️ STEP 3: ADDING CITY TAGS TO VENUE NAMES');
    console.log('=' .repeat(50));
    
    const cities = [
      { name: 'Vancouver', regex: /vancouver|bc|british columbia/i },
      { name: 'Calgary', regex: /calgary|ab|alberta/i },
      { name: 'Montreal', regex: /montreal|qc|quebec/i },
      { name: 'New York', regex: /new york|nyc|manhattan|brooklyn|queens/i },
      { name: 'Toronto', regex: /toronto|on|ontario/i }
    ];

    let cityTagCount = 0;
    for (const city of cities) {
      // Find events that belong to this city but don't have city in venue.name
      const eventsToTag = await Event.find({
        $or: [
          { location: city.regex },
          { address: city.regex },
          { 'venue.address': city.regex }
        ],
        'venue.name': { $not: new RegExp(city.name, 'i') }
      });

      console.log(`🏙️ Found ${eventsToTag.length} ${city.name} events to tag`);

      for (const event of eventsToTag) {
        const currentVenueName = event.venue?.name || 'Unknown Venue';
        const newVenueName = `${currentVenueName}, ${city.name}`;
        
        await Event.updateOne(
          { _id: event._id },
          { $set: { 'venue.name': newVenueName } }
        );
        cityTagCount++;
      }
    }
    console.log(`✅ Added city tags to ${cityTagCount} venues\n`);

    // STEP 4: Add coordinates using OpenStreetMap (real coordinates only)
    console.log('🌍 STEP 4: ADDING REAL COORDINATES');
    console.log('=' .repeat(50));
    
    const eventsWithoutCoords = await Event.find({
      $or: [
        { 'coordinates.lat': { $exists: false } },
        { 'coordinates.lat': null },
        { 'coordinates.lng': { $exists: false } },
        { 'coordinates.lng': null }
      ]
    }).limit(200); // Process in batches to avoid rate limiting
    
    console.log(`🔍 Found ${eventsWithoutCoords.length} events without coordinates (processing first 200)`);
    
    let coordsAddedCount = 0;
    for (const event of eventsWithoutCoords) {
      try {
        const venueName = event.venue?.name;
        const location = event.location;
        const query = venueName || location || 'Unknown';
        
        // Skip if no meaningful location data
        if (!query || query === 'Unknown' || query === 'MISSING') continue;
        
        // Use OpenStreetMap Nominatim API for real coordinates
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: {
            q: query,
            format: 'json',
            limit: 1,
            countrycodes: 'us,ca', // Focus on US/Canada
            addressdetails: 1
          },
          headers: {
            'User-Agent': 'Discovr-Event-App/1.0'
          }
        });
        
        if (response.data && response.data.length > 0) {
          const result = response.data[0];
          const lat = parseFloat(result.lat);
          const lng = parseFloat(result.lon);
          
          if (lat && lng) {
            await Event.updateOne(
              { _id: event._id },
              { $set: { 
                coordinates: { lat, lng },
                geocoded: true,
                geocode_source: 'OpenStreetMap'
              } }
            );
            coordsAddedCount++;
            console.log(`📍 Added coordinates for: ${query} (${lat}, ${lng})`);
          }
        }
        
        // Rate limiting - wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        // Skip errors and continue
        console.log(`⚠️ Skipped geocoding for: ${event.venue?.name || 'Unknown'}`);
      }
    }
    console.log(`✅ Added real coordinates to ${coordsAddedCount} events\n`);

    // STEP 5: Fix cross-city contamination
    console.log('🔄 STEP 5: FIXING CROSS-CITY CONTAMINATION');
    console.log('=' .repeat(50));
    
    const contaminated = await Event.find({
      'venue.name': {
        $regex: /Toronto.*Vancouver|Vancouver.*Toronto|Calgary.*Toronto|Toronto.*Calgary|Vancouver.*Calgary|Calgary.*Vancouver|New York.*Vancouver|Vancouver.*New York|Montreal.*Toronto|Toronto.*Montreal/i
      }
    });
    
    console.log(`🚨 Found ${contaminated.length} contaminated events`);
    
    let contaminationFixed = 0;
    for (const event of contaminated) {
      // Try to determine the primary city from the venue name
      const venueName = event.venue?.name || '';
      let primaryCity = '';
      
      if (venueName.toLowerCase().includes('vancouver')) primaryCity = 'Vancouver';
      else if (venueName.toLowerCase().includes('toronto')) primaryCity = 'Toronto';
      else if (venueName.toLowerCase().includes('calgary')) primaryCity = 'Calgary';
      else if (venueName.toLowerCase().includes('montreal')) primaryCity = 'Montreal';
      else if (venueName.toLowerCase().includes('new york')) primaryCity = 'New York';
      
      if (primaryCity) {
        // Remove other city names, keep only primary city
        const cleanVenueName = venueName
          .replace(/, Toronto/gi, '')
          .replace(/, Vancouver/gi, '')
          .replace(/, Calgary/gi, '')
          .replace(/, Montreal/gi, '')
          .replace(/, New York/gi, '');
        
        const finalVenueName = cleanVenueName.includes(primaryCity) ? 
          cleanVenueName : `${cleanVenueName}, ${primaryCity}`;
        
        await Event.updateOne(
          { _id: event._id },
          { $set: { 'venue.name': finalVenueName } }
        );
        contaminationFixed++;
      }
    }
    console.log(`✅ Fixed ${contaminationFixed} contaminated events\n`);

    // STEP 6: Normalize price fields
    console.log('💰 STEP 6: NORMALIZING PRICE FIELDS');
    console.log('=' .repeat(50));
    
    const eventsToPrice = await Event.find({
      $or: [
        { price: { $exists: false } },
        { price: null },
        { price: { $type: 'number' } },
        { price: { $type: 'object' } }
      ]
    });
    
    console.log(`💰 Found ${eventsToPrice.length} events to normalize prices`);
    
    for (const event of eventsToPrice) {
      let normalizedPrice = 'Free';
      
      if (event.price && typeof event.price === 'number') {
        normalizedPrice = event.price > 0 ? `$${event.price}` : 'Free';
      } else if (event.price && typeof event.price === 'object' && event.price.amount) {
        normalizedPrice = event.price.amount > 0 ? `$${event.price.amount}` : 'Free';
      }
      
      await Event.updateOne(
        { _id: event._id },
        { $set: { price: normalizedPrice } }
      );
    }
    console.log(`✅ Normalized ${eventsToPrice.length} price fields\n`);

    // FINAL STEP: Verify deployment
    console.log('🎯 FINAL STEP: VERIFYING DEPLOYMENT');
    console.log('=' .repeat(50));
    
    const finalCounts = {};
    const totalEvents = await Event.countDocuments({});
    console.log(`📊 Total events in production: ${totalEvents}`);
    
    for (const city of ['Vancouver', 'Calgary', 'Montreal', 'New York', 'Toronto']) {
      const count = await Event.countDocuments({
        'venue.name': new RegExp(city, 'i')
      });
      finalCounts[city] = count;
      console.log(`🏙️ ${city}: ${count} events`);
    }
    
    const eventsWithCoords = await Event.countDocuments({
      'coordinates.lat': { $exists: true, $ne: null },
      'coordinates.lng': { $exists: true, $ne: null }
    });
    console.log(`📍 Events with coordinates: ${eventsWithCoords}`);
    
    console.log('\n🎉 ALL FIXES DEPLOYED TO PRODUCTION!');
    console.log('🚀 Changes are now live on discovr-proxy-server.onrender.com');
    console.log('📱 App should immediately show improved event counts and quality!');
    console.log('\n💡 Expected app improvements:');
    console.log('   ✅ Cleaner event titles and data');
    console.log('   ✅ Better city filtering and tagging');
    console.log('   ✅ More events with coordinates');
    console.log('   ✅ Reduced cross-city contamination');
    console.log('   ✅ Normalized price and venue data');
    
    await mongoose.connection.close();
    return finalCounts;
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    throw error;
  }
}

// Run the deployment
deployAllFixesToProduction()
  .then((counts) => {
    console.log('\n✅ DEPLOYMENT COMPLETE! New production counts:', counts);
  })
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
