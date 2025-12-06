/**
 * Update All Events with Venue Addresses
 * Uses the all-cities-addresses.json file to update venue addresses
 */

const mongoose = require('mongoose');
const addresses = require('./all-cities-addresses.json');
require('dotenv').config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/discovr';

// Event Schema
const eventSchema = new mongoose.Schema({}, { strict: false, collection: 'events' });
const Event = mongoose.model('Event', eventSchema);

// Build a flat lookup map from all cities
function buildAddressLookup() {
  const lookup = {};
  for (const [city, venues] of Object.entries(addresses)) {
    for (const [venueName, address] of Object.entries(venues)) {
      // Store with lowercase key for case-insensitive lookup
      lookup[venueName.toLowerCase()] = { address, city };
    }
  }
  return lookup;
}

async function updateAllAddresses() {
  console.log('🚀 UPDATING ALL EVENTS WITH VENUE ADDRESSES\n');
  
  try {
    // Connect
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!\n');
    
    // Build lookup
    const addressLookup = buildAddressLookup();
    console.log(`📚 Loaded ${Object.keys(addressLookup).length} venue addresses\n`);
    
    // Get all events
    const events = await Event.find({});
    console.log(`📊 Found ${events.length} events to process\n`);
    
    let updated = 0;
    let skipped = 0;
    let noMatch = 0;
    
    for (const event of events) {
      const venueName = event.venue?.name || '';
      const currentAddress = event.venue?.address || '';
      
      // Skip if venue name is empty
      if (!venueName) {
        skipped++;
        continue;
      }
      
      // Skip if already has a real address (not just city name)
      if (currentAddress && currentAddress.length > 30 && currentAddress.includes(',')) {
        skipped++;
        continue;
      }
      
      // Look up address
      const lookupKey = venueName.toLowerCase().trim();
      const match = addressLookup[lookupKey];
      
      if (match) {
        // Update the event
        await Event.updateOne(
          { _id: event._id },
          { 
            $set: { 
              'venue.address': match.address
            }
          }
        );
        updated++;
        
        if (updated <= 10) {
          console.log(`✅ ${venueName} → ${match.address}`);
        }
      } else {
        noMatch++;
        if (noMatch <= 5) {
          console.log(`❌ No match for: ${venueName}`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`✅ Updated: ${updated} events`);
    console.log(`⏭️  Skipped (already had address): ${skipped}`);
    console.log(`❌ No match found: ${noMatch}`);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

updateAllAddresses();
