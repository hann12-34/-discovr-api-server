/**
 * Check Vancouver Events in MongoDB
 * 
 * This script connects to the MongoDB database and checks 
 * if Vancouver events were successfully imported
 */

require('dotenv').config();
const mongoose = require('mongoose');
const colors = require('colors');

// Set up MongoDB connection
const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
  console.error('❌ MONGODB_URI environment variable is not set'.red);
  process.exit(1);
}

// Event Schema (flexible to accommodate different event formats)
const eventSchema = new mongoose.Schema({}, { strict: false });
const Event = mongoose.model('Event', eventSchema);

// Connect to MongoDB and query events
async function checkVancouverEvents() {
  try {
    console.log('🔄 Connecting to MongoDB...'.yellow);
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB'.green);
    
    // Count total events
    const totalCount = await Event.countDocuments();
    console.log(`📊 Total events in database: ${totalCount}`.cyan);
    
    // Count and list Vancouver events
    const vancouverEvents = await Event.find({
      $or: [
        { 'venue.city': 'Vancouver' },
        { city: 'Vancouver' },
        { location: { $regex: 'Vancouver', $options: 'i' } },
        { venueLocation: { $regex: 'Vancouver', $options: 'i' } },
        { 'venue.location': { $regex: 'Vancouver', $options: 'i' } }
      ]
    }).limit(20);
    
    console.log(`📊 Found ${vancouverEvents.length} Vancouver events (showing first 20)`.cyan);
    
    // Display a sample of Vancouver events
    vancouverEvents.forEach((event, index) => {
      console.log(`\n${index + 1}. ${event.title || event.name || 'Unnamed Event'}`.yellow);
      console.log(`   Venue: ${event.venue?.name || event.venueName || 'Unknown Venue'}`.gray);
      console.log(`   Date: ${event.date || event.startDate || event.eventDate || 'Date unknown'}`.gray);
      
      // Show unique ID used for deduplication
      const idField = event._id || event.id || event.eventId;
      console.log(`   ID: ${idField}`.gray);
    });
    
    // Get a list of unique scrapers that contributed Vancouver events
    const scrapersList = await Event.distinct('scraper');
    console.log('\n📋 Events imported from these scrapers:'.cyan);
    scrapersList.forEach(scraper => {
      console.log(`   • ${scraper || 'Unknown scraper'}`.gray);
    });
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`.red);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed'.yellow);
  }
}

checkVancouverEvents().catch(console.error);
