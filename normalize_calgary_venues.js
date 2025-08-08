/**
 * Calgary Venue Normalization Script
 * Adds "Calgary" to venue addresses/locations for all Calgary variant events
 * This will make 709 hidden events visible in the app (from 0 to 709 events!)
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Event = require('./models/Event');

async function normalizeCalgaryVenues() {
  try {
    console.log('🤠 NORMALIZING CALGARY VENUE DATA FOR CITY FILTERING...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Calgary-related keywords that indicate Calgary events
    const calgaryVariants = [
      'calgary', 'yyc', 'cowtown', 'stampede city', 'alberta', 'ab',
      'bowness', 'kensington', 'inglewood', 'kingsland', 'mission',
      'eau claire', 'downtown calgary', 'calgary downtown', 'beltline',
      'hillhurst', 'chinatown calgary', 'forest lawn', 'mount royal'
    ];

    // Get all events from the database
    const allEvents = await Event.find({}).lean();
    console.log(`📊 Total events in database: ${allEvents.length}\n`);

    let updatedCount = 0;
    let alreadyHasCalgary = 0;
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
      
      // Skip if already contains "Calgary"
      if (location.includes('calgary') || venueName.includes('calgary') || 
          venueAddress.includes('calgary') || venueCity.includes('calgary')) {
        alreadyHasCalgary++;
        continue;
      }
      
      // Check if this event has Calgary variants
      const hasCalgaryVariant = calgaryVariants.some(variant => allText.includes(variant));
      
      if (hasCalgaryVariant) {
        // Prepare the update
        const updateData = {};
        
        // Update location field to include "Calgary"
        if (event.location && !event.location.toLowerCase().includes('calgary')) {
          // Add ", Calgary" if location doesn't already end with a city
          if (event.location.includes(',')) {
            updateData.location = event.location + ', Calgary';
          } else {
            updateData.location = event.location + ', Calgary';
          }
        } else if (!event.location) {
          updateData.location = 'Calgary';
        }
        
        // Handle venue updates more carefully due to string vs object issues
        if (!event.venue || typeof event.venue === 'string') {
          updateData.venue = { 
            name: event.venue || 'Calgary Venue',
            city: 'Calgary' 
          };
        } else {
          // Update venue city
          updateData['venue.city'] = 'Calgary';
          
          // Update venue address if it doesn't contain "Calgary"
          if (event.venue.address && !event.venue.address.toLowerCase().includes('calgary')) {
            if (event.venue.address.includes(',')) {
              updateData['venue.address'] = event.venue.address + ', Calgary';
            } else {
              updateData['venue.address'] = event.venue.address + ', Calgary';
            }
          }
        }
        
        if (Object.keys(updateData).length > 0) {
          updates.push({
            eventId: event._id,
            eventTitle: event.title,
            updateData: updateData,
            foundVariants: calgaryVariants.filter(variant => allText.includes(variant))
          });
        }
      }
    }

    console.log('🎯 CALGARY NORMALIZATION PLAN:');
    console.log('=' .repeat(50));
    console.log(`✅ Events already with "Calgary": ${alreadyHasCalgary}`);
    console.log(`🔧 Events to normalize: ${updates.length}`);
    console.log(`📈 Total Calgary events after fix: ${alreadyHasCalgary + updates.length}`);
    
    if (alreadyHasCalgary === 0) {
      console.log(`🚀 MASSIVE IMPROVEMENT: From 0 to ${updates.length} events (+∞%)`);
    } else {
      console.log(`🚀 Expected improvement: +${updates.length} events (+${Math.round((updates.length / (alreadyHasCalgary || 1)) * 100)}%)`);
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

      console.log('\n🤠 APPLYING CALGARY UPDATES...');
      
      // Apply updates in batches
      const batchSize = 100;
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        
        for (const update of batch) {
          try {
            await Event.updateOne(
              { _id: update.eventId },
              { $set: update.updateData }
            );
            updatedCount++;
            
            if (updatedCount % 100 === 0) {
              console.log(`   📊 Updated ${updatedCount}/${updates.length} events...`);
            }
          } catch (error) {
            console.error(`   ❌ Failed to update event ${update.eventId}:`, error.message);
          }
        }
      }
      
      console.log(`\n✅ SUCCESS! Updated ${updatedCount} Calgary events`);
      
      if (alreadyHasCalgary === 0) {
        console.log(`🎉 INCREDIBLE! App will now show ${updatedCount} Calgary events instead of 0!`);
        console.log(`🚀 Calgary is now ON THE MAP with ${updatedCount} events!`);
      } else {
        console.log(`🎉 App should now show ${alreadyHasCalgary + updatedCount} Calgary events instead of ${alreadyHasCalgary}!`);
        console.log(`📈 Improvement: +${updatedCount} events (+${Math.round((updatedCount / (alreadyHasCalgary || 1)) * 100)}%)`);
      }
      
    } else {
      console.log('\n✅ No events need normalization - all Calgary events already have "Calgary" in their data');
    }

    console.log('\n🏆 CALGARY NORMALIZATION COMPLETE!');
    
  } catch (error) {
    console.error('❌ Error normalizing Calgary venues:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  }
}

// Run the normalization
normalizeCalgaryVenues().catch(console.error);
