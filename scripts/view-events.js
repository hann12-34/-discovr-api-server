/**
 * Script to view events in the database
 * Run with: node scripts/view-events.js
 */

const mongoose = require('mongoose');
const Event = require('../models/Event');
require('dotenv').config();

async function viewEvents() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find events from Commodore Ballroom
    const events = await Event.find({
      'venue.name': 'Commodore Ballroom'
    }).sort({ startDate: 1 });
    
    console.log(`Found ${events.length} events from Commodore Ballroom`);
    
    if (events.length > 0) {
      // Display first 10 events
      console.log('\nMost recent events:');
      events.slice(0, 10).forEach((event, index) => {
        console.log(`\n--- Event ${index + 1} ---`);
        console.log(`Title: ${event.name}`);
        console.log(`Date: ${event.startDate.toISOString().split('T')[0]}`);
        console.log(`Venue: ${event.venue.name}`);
        console.log(`Source URL: ${event.sourceURL || 'N/A'}`);
      });
    } else {
      console.log('\nNo events found. Let\'s check why:');
      // Debug by checking if the saveEvents function is working correctly
      console.log('\nChecking for ANY events in the database:');
      const allEvents = await Event.find().limit(5);
      console.log(`Total events in database: ${await Event.countDocuments()}`);
      if (allEvents.length > 0) {
        console.log('Sample event:', allEvents[0].name);
      }
    }
  } catch (error) {
    console.error('Error viewing events:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
viewEvents();
