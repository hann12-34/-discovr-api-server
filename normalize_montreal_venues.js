/**
 * Montreal Venue Normalization Script
 * Adds "Montreal" to venue addresses/locations for all Montreal variant events
 * This will make 24 hidden events visible in the app (from 0 to 24 events!)
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Event = require('./models/Event');

async function normalizeMontrealVenues() {
  try {
    console.log('🍁 NORMALIZING MONTREAL VENUE DATA FOR CITY FILTERING...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Montreal-related keywords that indicate Montreal events
    const montrealVariants = [
      'montreal', 'montréal', 'mtl', 'quebec', 'qc', 'old montreal',
      'vieux-montréal', 'plateau', 'mile end', 'westmount', 'outremont',
      'verdun', 'laval', 'longueuil', 'saint-laurent', 'rosemont',
      'hochelaga', 'villeray', 'ahuntsic', 'côte-des-neiges'
    ];

    // Get all events from the database
    const allEvents = await Event.find({}).lean();
    console.log(`📊 Total events in database: ${allEvents.length}\n`);

    let updatedCount = 0;
    let alreadyHasMontreal = 0;
    const updates = [];

    for (const event of allEvents) {
      const location = (event.location || '').toLowerCase();
      const venueName = (event.venue?.name || '').toLowerCase();
      const venueAddress = (event.venue?.address || '').toLowerCase();
      const venueCity = (event.venue?.city || '').toLowerCase();
      const eventTitle = (event.title || '').toLowerCase();
      const description = (event.description || '').toLowerCase();
      
      // Combine all text fields for searching
      const allText = `${location} ${venueName} ${venueAddress} ${venueCity} ${eventTitle} ${description}`;
      
      // Skip if already contains "Montreal"
      if (location.includes('montreal') || venueName.includes('montreal') || 
          venueAddress.includes('montreal') || venueCity.includes('montreal')) {
        alreadyHasMontreal++;
        continue;
      }
      
      // Check if this event has Montreal variants
      const hasMontrealVariant = montrealVariants.some(variant => allText.includes(variant));
      
      if (hasMontrealVariant) {
        // Prepare the update
        const updateData = {};
        
        // Update location field to include "Montreal"
        if (event.location && !event.location.toLowerCase().includes('montreal')) {
          // Add ", Montreal" if location doesn't already end with a city
          if (event.location.includes(',')) {
            updateData.location = event.location + ', Montreal';
          } else {
            updateData.location = event.location + ', Montreal';
          }
        } else if (!event.location) {
          updateData.location = 'Montreal';
        }
        
        // Handle venue updates more carefully due to string vs object issues
        if (!event.venue || typeof event.venue === 'string') {
          updateData.venue = { 
            name: event.venue || 'Montreal Venue',
            city: 'Montreal' 
          };
        } else {
          // Update venue city
          updateData['venue.city'] = 'Montreal';
          
          // Update venue address if it doesn't contain "Montreal"
          if (event.venue.address && !event.venue.address.toLowerCase().includes('montreal')) {
            if (event.venue.address.includes(',')) {
              updateData['venue.address'] = event.venue.address + ', Montreal';
            } else {
              updateData['venue.address'] = event.venue.address + ', Montreal';
            }
          }
        }
        
        if (Object.keys(updateData).length > 0) {
          updates.push({
            eventId: event._id,
            eventTitle: event.title,
            updateData: updateData,
            foundVariants: montrealVariants.filter(variant => allText.includes(variant))
          });
        }
      }
    }

    console.log('🎯 MONTREAL NORMALIZATION PLAN:');
    console.log('=' .repeat(50));
    console.log(`✅ Events already with "Montreal": ${alreadyHasMontreal}`);
    console.log(`🔧 Events to normalize: ${updates.length}`);
    console.log(`📈 Total Montreal events after fix: ${alreadyHasMontreal + updates.length}`);
    
    if (alreadyHasMontreal === 0) {
      console.log(`🚀 MASSIVE IMPROVEMENT: From 0 to ${updates.length} events (+∞%)`);
    } else {
      console.log(`🚀 Expected improvement: +${updates.length} events (+${Math.round((updates.length / (alreadyHasMontreal || 1)) * 100)}%)`);
    }

    if (updates.length > 0) {
      console.log('\n📋 SAMPLE UPDATES:');
      console.log('=' .repeat(40));
      updates.slice(0, 10).forEach((update, index) => {
        console.log(`${index + 1}. "${update.eventTitle}"`);
        console.log(`   Variants: ${update.foundVariants.slice(0, 3).join(', ')}`);
        if (update.updateData.location) console.log(`   New location: ${update.updateData.location}`);
        if (update.updateData['venue.city']) console.log(`   New venue city: ${update.updateData['venue.city']}`);
        console.log('');
      });

      console.log('\n🍁 APPLYING MONTREAL UPDATES...');
      
      // Apply updates in batches
      const batchSize = 50;
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        
        for (const update of batch) {
          try {
            await Event.updateOne(
              { _id: update.eventId },
              { $set: update.updateData }
            );
            updatedCount++;
            
            if (updatedCount % 10 === 0) {
              console.log(`   📊 Updated ${updatedCount}/${updates.length} events...`);
            }
          } catch (error) {
            console.error(`   ❌ Failed to update event ${update.eventId}:`, error.message);
          }
        }
      }
      
      console.log(`\n✅ SUCCESS! Updated ${updatedCount} Montreal events`);
      
      if (alreadyHasMontreal === 0) {
        console.log(`🎉 INCREDIBLE! App will now show ${updatedCount} Montreal events instead of 0!`);
        console.log(`🚀 Montreal is now ON THE MAP with ${updatedCount} events!`);
      } else {
        console.log(`🎉 App should now show ${alreadyHasMontreal + updatedCount} Montreal events instead of ${alreadyHasMontreal}!`);
        console.log(`📈 Improvement: +${updatedCount} events (+${Math.round((updatedCount / (alreadyHasMontreal || 1)) * 100)}%)`);
      }
      
    } else {
      console.log('\n✅ No events need normalization - all Montreal events already have "Montreal" in their data');
    }

    console.log('\n🏆 MONTREAL NORMALIZATION COMPLETE!');
    
  } catch (error) {
    console.error('❌ Error normalizing Montreal venues:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  }
}

// Run the normalization
normalizeMontrealVenues().catch(console.error);
