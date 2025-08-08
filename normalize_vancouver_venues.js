/**
 * Vancouver Venue Normalization Script
 * Adds "Vancouver" to venue addresses/locations for all Vancouver variant events
 * This will make 444 hidden events visible in the app (+53% improvement)
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Event = require('./models/Event');

async function normalizeVancouverVenues() {
  try {
    console.log('🏔️ NORMALIZING VANCOUVER VENUE DATA FOR CITY FILTERING...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Vancouver-related keywords that indicate Vancouver events
    const vancouverVariants = [
      'vancouver', 'yvr', 'van city', 'british columbia', 'bc', 'gastown',
      'yaletown', 'kitsilano', 'west end', 'commercial drive', 'main street',
      'granville', 'robson', 'downtown vancouver', 'north vancouver', 'west vancouver',
      'burnaby', 'richmond', 'surrey', 'coquitlam', 'new westminster',
      'chinatown vancouver', 'mount pleasant', 'fairview', 'kerrisdale'
    ];

    // Get all events from the database
    const allEvents = await Event.find({}).lean();
    console.log(`📊 Total events in database: ${allEvents.length}\n`);

    let updatedCount = 0;
    let alreadyHasVancouver = 0;
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
      
      // Skip if already contains "Vancouver"
      if (location.includes('vancouver') || venueName.includes('vancouver') || 
          venueAddress.includes('vancouver') || venueCity.includes('vancouver')) {
        alreadyHasVancouver++;
        continue;
      }
      
      // Check if this event has Vancouver variants
      const hasVancouverVariant = vancouverVariants.some(variant => allText.includes(variant));
      
      if (hasVancouverVariant) {
        // Prepare the update
        const updateData = {};
        
        // Update location field to include "Vancouver"
        if (event.location && !event.location.toLowerCase().includes('vancouver')) {
          // Add ", Vancouver" if location doesn't already end with a city
          if (event.location.includes(',')) {
            updateData.location = event.location + ', Vancouver';
          } else {
            updateData.location = event.location + ', Vancouver';
          }
        } else if (!event.location) {
          updateData.location = 'Vancouver';
        }
        
        // Handle venue updates more carefully due to string vs object issues
        if (!event.venue || typeof event.venue === 'string') {
          updateData.venue = { 
            name: event.venue || 'Vancouver Venue',
            city: 'Vancouver' 
          };
        } else {
          // Update venue city
          updateData['venue.city'] = 'Vancouver';
          
          // Update venue address if it doesn't contain "Vancouver"
          if (event.venue.address && !event.venue.address.toLowerCase().includes('vancouver')) {
            if (event.venue.address.includes(',')) {
              updateData['venue.address'] = event.venue.address + ', Vancouver';
            } else {
              updateData['venue.address'] = event.venue.address + ', Vancouver';
            }
          }
        }
        
        if (Object.keys(updateData).length > 0) {
          updates.push({
            eventId: event._id,
            eventTitle: event.title,
            updateData: updateData,
            foundVariants: vancouverVariants.filter(variant => allText.includes(variant))
          });
        }
      }
    }

    console.log('🎯 VANCOUVER NORMALIZATION PLAN:');
    console.log('=' .repeat(50));
    console.log(`✅ Events already with "Vancouver": ${alreadyHasVancouver}`);
    console.log(`🔧 Events to normalize: ${updates.length}`);
    console.log(`📈 Total Vancouver events after fix: ${alreadyHasVancouver + updates.length}`);
    console.log(`🚀 Expected improvement: +${updates.length} events (+${Math.round((updates.length / (alreadyHasVancouver || 1)) * 100)}%)`);

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

      console.log('\n🏔️ APPLYING VANCOUVER UPDATES...');
      
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
      
      console.log(`\n✅ SUCCESS! Updated ${updatedCount} Vancouver events`);
      console.log(`🎉 App should now show ${alreadyHasVancouver + updatedCount} Vancouver events instead of ${alreadyHasVancouver}!`);
      console.log(`📈 Improvement: +${updatedCount} events (+${Math.round((updatedCount / (alreadyHasVancouver || 1)) * 100)}%)`);
      
    } else {
      console.log('\n✅ No events need normalization - all Vancouver events already have "Vancouver" in their data');
    }

    console.log('\n🏆 VANCOUVER NORMALIZATION COMPLETE!');
    
  } catch (error) {
    console.error('❌ Error normalizing Vancouver venues:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  }
}

// Run the normalization
normalizeVancouverVenues().catch(console.error);
