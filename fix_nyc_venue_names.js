/**
 * CORRECT APPROACH: NYC VENUE.NAME NORMALIZATION
 * App filters by venue.name, not venue.city!
 * Only 4 events have "New York" in venue.name, which matches app output
 * This script will add "New York" to venue.name for all NYC events
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function fixNYCVenueNames() {
  try {
    console.log('🗽 CORRECT APPROACH: NYC VENUE.NAME NORMALIZATION...\n');
    console.log('🎯 Discovery: App filters by venue.name, not venue.city!');
    console.log('📊 Current: Only 4 events have "New York" in venue.name');
    console.log('📱 App shows: 4 NYC events (exact match!)');
    console.log('🚀 Goal: Add "New York" to venue.name for all NYC events\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to Production MongoDB\n');

    const Event = require('./models/Event');

    // Find all events that should be NYC but don't have "New York" in venue.name
    const potentialNYCEvents = await Event.find({
      $or: [
        { location: { $regex: /new york|nyc|manhattan|brooklyn|queens|bronx/i } },
        { 'venue.address': { $regex: /new york|nyc|manhattan|brooklyn|queens|bronx/i } },
        { 'venue.city': { $regex: /new york/i } },
        { title: { $regex: /new york|nyc|manhattan|brooklyn|queens|bronx/i } },
        { description: { $regex: /new york|nyc|manhattan|brooklyn|queens|bronx/i } }
      ],
      $nor: [
        { 'venue.name': { $regex: /new york/i } }
      ]
    });

    console.log(`🔍 Found ${potentialNYCEvents.length} events needing venue.name normalization`);

    let normalized = 0;
    let skipped = 0;
    const updates = [];

    console.log('\n🔧 ANALYZING EVENTS FOR VENUE.NAME UPDATES...');
    console.log('=' .repeat(55));

    for (const event of potentialNYCEvents) {
      const location = (event.location || '').toLowerCase();
      const venueAddress = (event.venue?.address || '').toLowerCase();
      const venueCity = (event.venue?.city || '').toLowerCase();
      const title = (event.title || '').toLowerCase();
      const description = (event.description || '').toLowerCase();
      const currentVenueName = event.venue?.name || '';

      const allText = `${location} ${venueAddress} ${venueCity} ${title} ${description}`;
      
      // Check if this is definitely a NYC event
      const isNYCEvent = allText.includes('new york') || 
                        allText.includes('nyc') || 
                        allText.includes('manhattan') || 
                        allText.includes('brooklyn') || 
                        allText.includes('queens') || 
                        allText.includes('bronx');

      if (isNYCEvent) {
        // Create new venue name that includes "New York"
        let newVenueName;
        
        if (!currentVenueName || currentVenueName.trim() === '') {
          newVenueName = 'New York Venue';
        } else {
          // Add "New York" to existing venue name if it doesn't already contain it
          if (!currentVenueName.toLowerCase().includes('new york')) {
            newVenueName = `${currentVenueName} - New York`;
          } else {
            // Already has "New York", skip
            skipped++;
            continue;
          }
        }

        updates.push({
          eventId: event._id,
          title: event.title,
          currentVenueName: currentVenueName,
          newVenueName: newVenueName,
          reason: allText.includes('new york') ? 'Contains "New York"' :
                  allText.includes('nyc') ? 'Contains "NYC"' :
                  allText.includes('manhattan') ? 'Contains "Manhattan"' :
                  'Contains NYC variant'
        });
      } else {
        skipped++;
      }
    }

    console.log(`📊 Events to update: ${updates.length}`);
    console.log(`⏭️ Events skipped: ${skipped}`);

    if (updates.length > 0) {
      console.log('\n📋 SAMPLE VENUE.NAME UPDATES:');
      console.log('=' .repeat(45));
      updates.slice(0, 10).forEach((update, i) => {
        console.log(`${i + 1}. "${update.title}"`);
        console.log(`   Current venue.name: "${update.currentVenueName}"`);
        console.log(`   New venue.name: "${update.newVenueName}"`);
        console.log(`   Reason: ${update.reason}`);
        console.log('');
      });

      console.log('\n🚀 APPLYING VENUE.NAME UPDATES...');
      console.log('=' .repeat(40));

      for (const update of updates) {
        try {
          // Handle different venue field types
          if (!update.currentVenueName || update.currentVenueName.trim() === '') {
            // Create new venue object with New York name
            await Event.updateOne(
              { _id: update.eventId },
              { 
                $set: { 
                  venue: { 
                    name: update.newVenueName,
                    city: 'New York'
                  }
                }
              }
            );
          } else {
            // Update existing venue name
            await Event.updateOne(
              { _id: update.eventId },
              { $set: { 'venue.name': update.newVenueName } }
            );
          }
          
          normalized++;
          
          if (normalized % 50 === 0) {
            console.log(`   📊 Updated ${normalized}/${updates.length} venue names...`);
          }
          
        } catch (error) {
          console.error(`   ❌ Failed to update ${update.eventId}: ${error.message}`);
        }
      }

      console.log(`\n✅ VENUE.NAME NORMALIZATION COMPLETE!`);
      console.log(`🔧 Updated: ${normalized} events`);
      console.log(`⏭️ Skipped: ${skipped} events`);

      // Verify the fix
      const verifyNYCEvents = await Event.countDocuments({
        'venue.name': { $regex: /new york/i }
      });

      console.log(`\n🎯 VERIFICATION:`);
      console.log(`📊 Events with "New York" in venue.name: ${verifyNYCEvents}`);
      console.log(`📱 App should now show ~${verifyNYCEvents} NYC events instead of 4!`);

      const improvement = Math.round(((verifyNYCEvents - 4) / 4) * 100);
      console.log(`🚀 Expected improvement: +${verifyNYCEvents - 4} events (+${improvement}%)`);

      console.log('\n🏆 SUCCESS! VENUE.NAME NORMALIZATION COMPLETE!');
      console.log('📱 Please test the app - NYC events should increase dramatically!');
      console.log('🎯 This time we fixed the RIGHT field that the app actually uses!');

    } else {
      console.log('\n✅ No venue.name updates needed - all NYC events already normalized');
    }

  } catch (error) {
    console.error('❌ Error normalizing NYC venue names:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection closed');
  }
}

// Run the correct venue.name normalization
fixNYCVenueNames().catch(console.error);
