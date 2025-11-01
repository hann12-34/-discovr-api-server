/**
 * Enrich ALL Events with Venue Addresses
 * 
 * This script updates all existing events in the database
 * with proper addresses and coordinates from the venue database.
 */

const mongoose = require('mongoose');
const { enrichEventWithVenueData, getKnownVenues } = require('./utils/venueDatabase');
require('dotenv').config();

// MongoDB Event Schema
const eventSchema = new mongoose.Schema({}, { strict: false, collection: 'events' });
const Event = mongoose.model('Event', eventSchema);

async function enrichAllEvents() {
  try {
    console.log('🚀 ENRICHING ALL EVENTS WITH VENUE ADDRESSES\n');
    console.log('=' .repeat(60));
    
    // Connect to MongoDB
    console.log('\n📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || process.env.PRODUCTION_MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ Connected to MongoDB\n');
    
    // Get all events
    console.log('📊 Fetching all events...');
    const allEvents = await Event.find({});
    console.log(`   Total events in database: ${allEvents.length}\n`);
    
    const knownVenues = getKnownVenues();
    console.log(`📚 Known venues in database: ${knownVenues.length}`);
    console.log(`   ${knownVenues.join(', ')}\n`);
    
    let enrichedCount = 0;
    let skippedCount = 0;
    const enrichmentsByVenue = {};
    
    console.log('🔧 Processing events...\n');
    
    for (const event of allEvents) {
      const venueName = event.venue?.name || event.venue;
      
      if (!venueName) {
        skippedCount++;
        continue;
      }
      
      // Try to enrich
      const enrichedData = enrichEventWithVenueData(event.toObject());
      
      // Check if enrichment added data
      if (enrichedData.streetAddress && enrichedData.latitude && enrichedData.longitude) {
        // Update the event
        await Event.updateOne(
          { _id: event._id },
          {
            $set: {
              streetAddress: enrichedData.streetAddress,
              location: enrichedData.location,
              latitude: enrichedData.latitude,
              longitude: enrichedData.longitude,
              'venue.address': enrichedData.streetAddress,
              'venue.location': enrichedData.venue.location
            }
          }
        );
        
        enrichedCount++;
        
        // Track by venue
        if (!enrichmentsByVenue[venueName]) {
          enrichmentsByVenue[venueName] = 0;
        }
        enrichmentsByVenue[venueName]++;
        
        if (enrichedCount % 10 === 0) {
          process.stdout.write(`\r   Enriched: ${enrichedCount} events...`);
        }
      } else {
        skippedCount++;
      }
    }
    
    console.log('\n');
    console.log('=' .repeat(60));
    console.log('\n✅ ENRICHMENT COMPLETE!\n');
    console.log(`📊 Summary:`);
    console.log(`   Total events: ${allEvents.length}`);
    console.log(`   Enriched: ${enrichedCount} (${(enrichedCount/allEvents.length*100).toFixed(1)}%)`);
    console.log(`   Skipped: ${skippedCount} (${(skippedCount/allEvents.length*100).toFixed(1)}%)`);
    
    console.log(`\n📍 Enrichments by venue:`);
    Object.entries(enrichmentsByVenue)
      .sort((a, b) => b[1] - a[1])
      .forEach(([venue, count]) => {
        console.log(`   ${venue}: ${count} events`);
      });
    
    console.log('\n🎉 All events enriched with venue addresses!');
    console.log('📱 iOS app will now show proper addresses for these venues.\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  enrichAllEvents();
}

module.exports = { enrichAllEvents };
