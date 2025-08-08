/**
 * EMERGENCY FIX: New York venue.city Field Correction
 * Critical bug: Events have "New York" in location but wrong venue.city values
 * App filters by venue.city, so these events are hidden from New York searches
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Event = require('./models/Event');

async function fixNYCVenueCity() {
  try {
    console.log('🚨 EMERGENCY FIX: CORRECTING NEW YORK VENUE.CITY FIELDS...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all events that should be New York events but have wrong venue.city
    const nycEvents = await Event.find({
      $or: [
        { location: { $regex: /new york/i } },
        { 'venue.name': { $regex: /new york/i } },
        { 'venue.address': { $regex: /new york/i } },
        { title: { $regex: /new york|nyc|manhattan|brooklyn|queens|bronx/i } },
        { description: { $regex: /new york|nyc|manhattan|brooklyn|queens|bronx/i } }
      ]
    }).lean();

    console.log(`🔍 Found ${nycEvents.length} potential New York events\n`);

    let correctedCount = 0;
    const corrections = [];

    for (const event of nycEvents) {
      const location = (event.location || '').toLowerCase();
      const venueName = (event.venue?.name || '').toLowerCase();
      const venueAddress = (event.venue?.address || '').toLowerCase();
      const venueCity = (event.venue?.city || '').toLowerCase();
      const title = (event.title || '').toLowerCase();
      const description = (event.description || '').toLowerCase();

      // Check if this event should be a New York event
      const allText = `${location} ${venueName} ${venueAddress} ${title} ${description}`;
      const isNYCEvent = allText.includes('new york') || 
                        allText.includes('nyc') || 
                        allText.includes('manhattan') || 
                        allText.includes('brooklyn') || 
                        allText.includes('queens') || 
                        allText.includes('bronx');

      // Check if venue.city is NOT "New York" (case-insensitive)
      const needsCorrection = isNYCEvent && !venueCity.includes('new york');

      if (needsCorrection) {
        corrections.push({
          eventId: event._id,
          title: event.title,
          currentVenueCity: event.venue?.city || 'N/A',
          location: event.location,
          reason: allText.includes('new york') ? 'location contains "New York"' :
                  allText.includes('nyc') ? 'contains "NYC"' :
                  allText.includes('manhattan') ? 'contains "Manhattan"' :
                  'contains NYC variant'
        });
      }
    }

    console.log('🎯 NEW YORK VENUE.CITY CORRECTION PLAN:');
    console.log('=' .repeat(60));
    console.log(`🔧 Events needing venue.city correction: ${corrections.length}`);

    if (corrections.length > 0) {
      console.log('\n📋 SAMPLE CORRECTIONS:');
      console.log('=' .repeat(50));
      corrections.slice(0, 10).forEach((correction, index) => {
        console.log(`${index + 1}. "${correction.title}"`);
        console.log(`   Current venue.city: "${correction.currentVenueCity}"`);
        console.log(`   Will change to: "New York"`);
        console.log(`   Reason: ${correction.reason}`);
        console.log(`   Location: "${correction.location}"`);
        console.log('');
      });

      console.log('\n🚨 APPLYING CRITICAL VENUE.CITY CORRECTIONS...');
      
      // Apply corrections in batches
      const batchSize = 100;
      for (let i = 0; i < corrections.length; i += batchSize) {
        const batch = corrections.slice(i, i + batchSize);
        
        for (const correction of batch) {
          try {
            await Event.updateOne(
              { _id: correction.eventId },
              { 
                $set: { 
                  'venue.city': 'New York'
                }
              }
            );
            correctedCount++;
            
            if (correctedCount % 50 === 0) {
              console.log(`   📊 Corrected ${correctedCount}/${corrections.length} events...`);
            }
          } catch (error) {
            console.error(`   ❌ Failed to correct event ${correction.eventId}:`, error.message);
          }
        }
      }
      
      console.log(`\n✅ SUCCESS! Corrected venue.city for ${correctedCount} New York events`);
      console.log(`🎉 App should now show ${correctedCount} New York events when filtering by city!`);
      console.log(`🚀 CRITICAL BUG FIXED: venue.city now matches location for New York events`);
      
    } else {
      console.log('\n✅ No venue.city corrections needed - all NYC events already have correct venue.city');
    }

    // Verify the fix
    console.log('\n🔍 VERIFICATION: Checking corrected events...');
    const verificationEvents = await Event.find({
      'venue.city': { $regex: /new york/i }
    }).lean();
    
    console.log(`✅ VERIFICATION COMPLETE: ${verificationEvents.length} events now have venue.city = "New York"`);
    console.log(`🎯 App city filtering should now find these ${verificationEvents.length} events!`);

    console.log('\n🏆 NEW YORK VENUE.CITY CORRECTION COMPLETE!');
    
  } catch (error) {
    console.error('❌ Error fixing NYC venue.city:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  }
}

// Run the critical fix
fixNYCVenueCity().catch(console.error);
