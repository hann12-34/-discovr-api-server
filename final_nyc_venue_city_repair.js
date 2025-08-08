/**
 * FINAL NYC VENUE.CITY REPAIR FOR PRODUCTION
 * App shows 3429 events (SUCCESS!) but NYC = 4 events
 * Production has 277 NYC events but venue.city fields not set correctly
 * This will fix ALL venue.city fields for NYC events to unlock 277 → 4 improvement
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function finalNYCVenueCityRepair() {
  try {
    console.log('🗽 FINAL NYC VENUE.CITY REPAIR FOR PRODUCTION...\n');
    console.log('🎯 Current: App shows 4 NYC events');
    console.log('🎯 Available: Production has 277 NYC events'); 
    console.log('🎯 Goal: Fix venue.city so app finds all 277 events\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to Production MongoDB\n');

    const Event = require('./models/Event');

    // Get all events that should be NYC but don't have venue.city = "New York"
    const potentialNYCEvents = await Event.find({
      $or: [
        { location: { $regex: /new york|nyc|manhattan|brooklyn|queens|bronx/i } },
        { 'venue.name': { $regex: /new york|nyc|manhattan|brooklyn|queens|bronx/i } },
        { 'venue.address': { $regex: /new york|nyc|manhattan|brooklyn|queens|bronx/i } },
        { title: { $regex: /new york|nyc|manhattan|brooklyn|queens|bronx/i } },
        { description: { $regex: /new york|nyc|manhattan|brooklyn|queens|bronx/i } }
      ],
      $nor: [
        { 'venue.city': { $regex: /new york/i } }
      ]
    });

    console.log(`🔍 Found ${potentialNYCEvents.length} events needing NYC venue.city fix`);

    let repaired = 0;
    let skipped = 0;

    console.log('\n🔧 APPLYING VENUE.CITY FIXES...');
    console.log('=' .repeat(50));

    for (const event of potentialNYCEvents) {
      const location = (event.location || '').toLowerCase();
      const venueName = (event.venue?.name || '').toLowerCase(); 
      const venueAddress = (event.venue?.address || '').toLowerCase();
      const title = (event.title || '').toLowerCase();
      const description = (event.description || '').toLowerCase();

      const allText = `${location} ${venueName} ${venueAddress} ${title} ${description}`;
      
      // Check if this is definitely a NYC event
      const isNYCEvent = allText.includes('new york') || 
                        allText.includes('nyc') || 
                        allText.includes('manhattan') || 
                        allText.includes('brooklyn') || 
                        allText.includes('queens') || 
                        allText.includes('bronx') || 
                        allText.includes('staten island');

      if (isNYCEvent) {
        try {
          // Handle different venue field types
          if (!event.venue) {
            // Create venue object
            await Event.updateOne(
              { _id: event._id },
              { 
                $set: { 
                  venue: { 
                    name: 'New York Venue',
                    city: 'New York'
                  }
                }
              }
            );
          } else if (typeof event.venue === 'string') {
            // Convert string venue to object
            await Event.updateOne(
              { _id: event._id },
              { 
                $set: { 
                  venue: { 
                    name: event.venue,
                    city: 'New York'
                  }
                }
              }
            );
          } else {
            // Update existing venue object
            await Event.updateOne(
              { _id: event._id },
              { $set: { 'venue.city': 'New York' } }
            );
          }
          
          repaired++;
          
          if (repaired % 50 === 0) {
            console.log(`   📊 Repaired ${repaired}/${potentialNYCEvents.length} events...`);
          }
          
        } catch (error) {
          console.error(`   ❌ Failed to repair ${event._id}: ${error.message}`);
          skipped++;
        }
      } else {
        skipped++;
      }
    }

    console.log(`\n✅ REPAIR COMPLETE!`);
    console.log(`🔧 Repaired: ${repaired} events`);
    console.log(`⏭️ Skipped: ${skipped} events`);

    // Verify the fix
    const verifyNYCEvents = await Event.countDocuments({
      'venue.city': { $regex: /new york/i }
    });

    console.log(`\n🎯 VERIFICATION:`);
    console.log(`📊 Events with venue.city = "New York": ${verifyNYCEvents}`);
    console.log(`📱 App should now show ~${verifyNYCEvents} NYC events instead of 4!`);

    if (verifyNYCEvents > 200) {
      console.log(`🎉 SUCCESS! Massive improvement expected in app!`);
    } else if (verifyNYCEvents > 50) {
      console.log(`✅ Good improvement expected in app!`);
    } else {
      console.log(`⚠️ Limited improvement - may need further investigation`);
    }

    console.log('\n🏆 FINAL NYC VENUE.CITY REPAIR COMPLETE!');
    console.log('📱 Please check the app - NYC events should increase dramatically!');

  } catch (error) {
    console.error('❌ Error in final NYC repair:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection closed');
  }
}

// Run the final repair
finalNYCVenueCityRepair().catch(console.error);
