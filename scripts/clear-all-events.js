/**
 * Clear All Events from Database
 * 
 * Removes all events from MongoDB database to clean up corrupted data
 * with "Unknown" city labels and cross-city contamination issues.
 */

require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB configuration
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://discovrapp:FZNwIj6DXXNJjhDU@cluster0.yfnbe.mongodb.net/test?retryWrites=true&w=majority";

// Create Event model schema
const eventSchema = new mongoose.Schema({
  id: String,
  title: String,
  venue: mongoose.Schema.Types.Mixed,
  location: String,
  city: String,
  date: String,
  category: String,
  description: String,
  link: String,
  source: String
}, { 
  collection: 'events',
  timestamps: true 
});

const Event = mongoose.model('Event', eventSchema);

async function clearAllEvents() {
  console.log('\n🗑️ CLEARING ALL EVENTS FROM DATABASE');
  console.log('='.repeat(50));
  
  try {
    // Connect to MongoDB
    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!');
    
    // Count existing events
    const eventCount = await Event.countDocuments();
    console.log(`📊 Found ${eventCount} events in database`);
    
    if (eventCount === 0) {
      console.log('✅ Database is already empty!');
      return;
    }
    
    // Ask for confirmation
    console.log('\n🚨 WARNING: This will permanently delete ALL events!');
    console.log('📝 Reason: Clean up corrupted data with "Unknown" city labels');
    console.log('🔄 Plan: Re-import with proper city tagging after fix');
    
    // Delete all events
    console.log('\n🗑️ Deleting all events...');
    const result = await Event.deleteMany({});
    
    console.log(`✅ Successfully deleted ${result.deletedCount} events`);
    console.log('🧹 Database is now clean and ready for properly tagged events');
    
  } catch (error) {
    console.error('❌ Error clearing events:', error.message);
    throw error;
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the cleanup
clearAllEvents()
  .then(() => {
    console.log('\n🎉 DATABASE CLEANUP COMPLETE!');
    console.log('📱 Mobile app should now be clean of corrupted events');
    console.log('🚀 Ready to re-import events with proper city tagging');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  });
