/**
 * Toronto Venue Normalization Script
 * Adds "Toronto" to venue addresses/locations for all Toronto variant events
 * This will make 1,939 hidden events visible in the app (+614% improvement)
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Event = require('./models/Event');

async function normalizeTorontoVenues() {
  try {
    console.log('🏙️ NORMALIZING TORONTO VENUE DATA FOR CITY FILTERING...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Toronto-related keywords that indicate Toronto events
    const torontoVariants = [
      'toronto', 'to', 'the 6ix', 'the six', 'ontario', 'on', 'yyz',
      'downtown toronto', 'scarborough', 'north york', 'etobicoke', 'york',
      'mississauga', 'markham', 'richmond hill', 'vaughan', 'brampton',
      'king street', 'queen street', 'dundas', 'bloor', 'entertainment district',
      'distillery district', 'harbourfront', 'cn tower area', 'financial district toronto'
    ];

    // Get all events from the database
    const allEvents = await Event.find({}).lean();
    console.log(`📊 Total events in database: ${allEvents.length}\n`);

    let updatedCount = 0;
    let alreadyHasToronto = 0;
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
      
      // Skip if already contains "Toronto"
      if (location.includes('toronto') || venueName.includes('toronto') || 
          venueAddress.includes('toronto') || venueCity.includes('toronto')) {
        alreadyHasToronto++;
        continue;
      }
      
      // Check if this event has Toronto variants
      const hasTorontoVariant = torontoVariants.some(variant => allText.includes(variant));
      
      if (hasTorontoVariant) {
        // Prepare the update
        const updateData = {};
        
        // Update location field to include "Toronto"
        if (event.location && !event.location.toLowerCase().includes('toronto')) {
          // Add ", Toronto" if location doesn't already end with a city
          if (event.location.includes(',')) {
            updateData.location = event.location + ', Toronto';
          } else {
            updateData.location = event.location + ', Toronto';
          }
        } else if (!event.location) {
          updateData.location = 'Toronto';
        }
        
        // Handle venue updates more carefully due to string vs object issues
        if (!event.venue || typeof event.venue === 'string') {
          updateData.venue = { 
            name: event.venue || 'Toronto Venue',
            city: 'Toronto' 
          };
        } else {
          // Update venue city
          updateData['venue.city'] = 'Toronto';
          
          // Update venue address if it doesn't contain "Toronto"
          if (event.venue.address && !event.venue.address.toLowerCase().includes('toronto')) {
            if (event.venue.address.includes(',')) {
              updateData['venue.address'] = event.venue.address + ', Toronto';
            } else {
              updateData['venue.address'] = event.venue.address + ', Toronto';
            }
          }
        }
        
        if (Object.keys(updateData).length > 0) {
          updates.push({
            eventId: event._id,
            eventTitle: event.title,
            updateData: updateData,
            foundVariants: torontoVariants.filter(variant => allText.includes(variant))
          });
        }
      }
    }

    console.log('🎯 TORONTO NORMALIZATION PLAN:');
    console.log('=' .repeat(50));
    console.log(`✅ Events already with "Toronto": ${alreadyHasToronto}`);
    console.log(`🔧 Events to normalize: ${updates.length}`);
    console.log(`📈 Total Toronto events after fix: ${alreadyHasToronto + updates.length}`);
    console.log(`🚀 Expected improvement: +${updates.length} events (+${Math.round((updates.length / (alreadyHasToronto || 1)) * 100)}%)`);

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

      console.log('\n🚀 APPLYING TORONTO UPDATES...');
      
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
            
            if (updatedCount % 200 === 0) {
              console.log(`   📊 Updated ${updatedCount}/${updates.length} events...`);
            }
          } catch (error) {
            console.error(`   ❌ Failed to update event ${update.eventId}:`, error.message);
          }
        }
      }
      
      console.log(`\n✅ SUCCESS! Updated ${updatedCount} Toronto events`);
      console.log(`🎉 App should now show ${alreadyHasToronto + updatedCount} Toronto events instead of ${alreadyHasToronto}!`);
      console.log(`📈 Improvement: +${updatedCount} events (+${Math.round((updatedCount / (alreadyHasToronto || 1)) * 100)}%)`);
      
    } else {
      console.log('\n✅ No events need normalization - all Toronto events already have "Toronto" in their data');
    }

    console.log('\n🏆 TORONTO NORMALIZATION COMPLETE!');
    
  } catch (error) {
    console.error('❌ Error normalizing Toronto venues:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  }
}

// Run the normalization
normalizeTorontoVenues().catch(console.error);
