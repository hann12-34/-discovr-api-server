/**
 * Script to update existing Commodore Ballroom events with location coordinates
 * Run with: node scripts/update-events-coordinates.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Event = require('../models/Event');

// Commodore Ballroom coordinates
const VENUE_COORDS = {
  latitude: 49.2807357,
  longitude: -123.1206403
};

async function updateEventsCoordinates() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find all Commodore Ballroom events
    const filter = { 'venue.name': 'Commodore Ballroom' };
    
    // Count events before update
    const count = await Event.countDocuments(filter);
    console.log(`Found ${count} events from Commodore Ballroom`);
    
    // Update events with coordinates and improved location
    const updateResult = await Event.updateMany(
      filter,
      {
        $set: {
          latitude: VENUE_COORDS.latitude,
          longitude: VENUE_COORDS.longitude,
          location: 'Vancouver, BC',
          'venue.latitude': VENUE_COORDS.latitude,
          'venue.longitude': VENUE_COORDS.longitude,
          'venue.city': 'Vancouver',
          'venue.state': 'BC'
        }
      }
    );
    
    console.log(`Updated ${updateResult.modifiedCount} events with coordinates`);
    
    // Verify a sample of updated events
    const updatedEvents = await Event.find(filter).limit(5);
    
    console.log('\nSample of updated events:');
    updatedEvents.forEach((event, i) => {
      console.log(`\n--- Event ${i+1} ---`);
      console.log(`Title: ${event.name}`);
      console.log(`Location: ${event.location}`);
      console.log(`Coordinates: ${event.latitude}, ${event.longitude}`);
      console.log(`Venue: ${event.venue.name}, ${event.venue.city}, ${event.venue.state}`);
      console.log(`Venue Coordinates: ${event.venue.latitude}, ${event.venue.longitude}`);
    });
    
  } catch (error) {
    console.error('Error updating events:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
updateEventsCoordinates();
