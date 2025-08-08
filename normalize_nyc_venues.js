/**
 * NYC Venue Normalization Script
 * Adds "New York" to venue addresses/locations for all NYC variant events
 * This will make them visible in the app's city filtering
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Event = require('./models/Event');

async function normalizeNYCVenues() {
  try {
    console.log('🗽 NORMALIZING NYC VENUE DATA FOR CITY FILTERING...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // NYC-related keywords that indicate New York events
    const nycVariants = [
      'nyc', 'manhattan', 'brooklyn', 'queens', 'bronx', 'staten island',
      'harlem', 'williamsburg', 'soho', 'tribeca', 'chelsea', 'midtown', 'downtown',
      'upper east side', 'upper west side', 'lower east side', 'east village', 'west village',
      'greenwich village', 'financial district', 'chinatown', 'little italy',
      'times square', 'broadway', 'central park', 'wall street', 'fifth avenue',
      'madison avenue', 'park avenue', 'lexington avenue'
    ];

    // Get all events from the database
    const allEvents = await Event.find({}).lean();
    console.log(`📊 Total events in database: ${allEvents.length}\n`);

    let updatedCount = 0;
    let alreadyHasNewYork = 0;
    const updates = [];

    for (const event of allEvents) {
      const location = (event.location || '').toLowerCase();
      const venueName = (event.venue?.name || '').toLowerCase();
      const venueAddress = (event.venue?.address || '').toLowerCase();
      const eventTitle = (event.title || '').toLowerCase();
      const description = (event.description || '').toLowerCase();
      
      // Combine all text fields for searching
      const allText = `${location} ${venueName} ${venueAddress} ${eventTitle} ${description}`;
      
      // Skip if already contains "New York"
      if (location.includes('new york') || venueName.includes('new york') || venueAddress.includes('new york')) {
        alreadyHasNewYork++;
        continue;
      }
      
      // Check if this event has NYC variants
      const hasNYCVariant = nycVariants.some(variant => allText.includes(variant));
      
      if (hasNYCVariant) {
        // Prepare the update
        const updateData = {};
        
        // Update location field to include "New York"
        if (event.location && !event.location.toLowerCase().includes('new york')) {
          // Add ", New York" if location doesn't already end with a city
          if (event.location.includes(',')) {
            updateData.location = event.location + ', New York';
          } else {
            updateData.location = event.location + ', New York';
          }
        } else if (!event.location) {
          updateData.location = 'New York';
        }
        
        // Ensure venue has city field set to "New York"
        if (!event.venue) {
          updateData.venue = { city: 'New York' };
        } else {
          // Update venue city
          updateData['venue.city'] = 'New York';
          
          // Update venue address if it doesn't contain "New York"
          if (event.venue.address && !event.venue.address.toLowerCase().includes('new york')) {
            if (event.venue.address.includes(',')) {
              updateData['venue.address'] = event.venue.address + ', New York';
            } else {
              updateData['venue.address'] = event.venue.address + ', New York';
            }
          }
        }
        
        if (Object.keys(updateData).length > 0) {
          updates.push({
            eventId: event._id,
            eventTitle: event.title,
            updateData: updateData,
            foundVariants: nycVariants.filter(variant => allText.includes(variant))
          });
        }
      }
    }

    console.log('🎯 NORMALIZATION PLAN:');
    console.log('=' .repeat(50));
    console.log(`✅ Events already with "New York": ${alreadyHasNewYork}`);
    console.log(`🔧 Events to normalize: ${updates.length}`);
    console.log(`📈 Total NYC events after fix: ${alreadyHasNewYork + updates.length}`);

    if (updates.length > 0) {
      console.log('\n📋 SAMPLE UPDATES:');
      console.log('=' .repeat(40));
      updates.slice(0, 10).forEach((update, index) => {
        console.log(`${index + 1}. "${update.eventTitle}"`);
        console.log(`   Variants: ${update.foundVariants.join(', ')}`);
        console.log(`   Updates: ${JSON.stringify(update.updateData)}`);
        console.log('');
      });

      console.log('\n🚀 APPLYING UPDATES...');
      
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
            
            if (updatedCount % 50 === 0) {
              console.log(`   📊 Updated ${updatedCount}/${updates.length} events...`);
            }
          } catch (error) {
            console.error(`   ❌ Failed to update event ${update.eventId}:`, error.message);
          }
        }
      }
      
      console.log(`\n✅ SUCCESS! Updated ${updatedCount} events with NYC normalization`);
      console.log(`🎉 App should now show ${alreadyHasNewYork + updatedCount} New York events instead of ${alreadyHasNewYork}!`);
      console.log(`📈 Improvement: +${updatedCount} events (+${Math.round((updatedCount / (alreadyHasNewYork || 1)) * 100)}%)`);
      
    } else {
      console.log('\n✅ No events need normalization - all NYC events already have "New York" in their data');
    }

    console.log('\n🏆 NORMALIZATION COMPLETE!');
    
  } catch (error) {
    console.error('❌ Error normalizing NYC venues:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  }
}

// Run the normalization
normalizeNYCVenues().catch(console.error);
