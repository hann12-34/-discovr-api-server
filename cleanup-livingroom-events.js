/**
 * Script to clean up incorrectly imported Living Room events
 * This removes navigation elements and other non-event entries
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('./models/Event');

async function cleanupEvents() {
  console.log('🧹 Starting Living Room events cleanup...');
  
  try {
    // Connect to MongoDB
    console.log(`🔌 Connecting to MongoDB at ${process.env.MONGODB_URI.substring(0, 20)}...`);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // List of invalid event titles that should be removed
    const invalidTitles = [
      'Skip to Main Content',
      'HOME',
      'PRIVATE EVENTS',
      'INFO',
      'Call - (604) 605-4340',
      'Call (604) 605-4340'
    ];
    
    // Find and delete the invalid events
    const deleteResult = await Event.deleteMany({
      'venue.name': 'The Living Room Vancouver',
      $or: [
        { title: { $in: invalidTitles } },
        // Remove phone numbers
        { title: /^Call.*\d{3}.*\d{3}.*\d{4}/ }
      ]
    });
    
    console.log(`🗑️ Deleted ${deleteResult.deletedCount} invalid Living Room events`);
    
    // Find and list the remaining valid events
    const validEvents = await Event.find({
      'venue.name': 'The Living Room Vancouver'
    });
    
    console.log(`✅ Remaining valid Living Room events: ${validEvents.length}`);
    
    // List the valid events
    if (validEvents.length > 0) {
      console.log('Valid events:');
      validEvents.forEach(event => {
        console.log(`- ${event.title}`);
      });
    }
    
  } catch (error) {
    console.error(`❌ Error cleaning up Living Room events: ${error.message}`);
    console.error(error.stack);
  } finally {
    // Close the MongoDB connection
    await mongoose.disconnect();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the cleanup function
cleanupEvents();
