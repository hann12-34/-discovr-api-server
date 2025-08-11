/**
 * CRITICAL DIAGNOSIS: Mobile App City Filtering Broken
 * 
 * Investigates the actual events in database and identifies why
 * mobile app city filtering returns 0 results for all cities.
 * 
 * Mobile app shows 310 events but 0 after city filtering - major issue!
 */

require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB configuration
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://discovrapp:FZNwIj6DXXNJjhDU@cluster0.yfnbe.mongodb.net/test?retryWrites=true&w=majority";

// Event model
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

async function diagnoseDatabaseEvents() {
    console.log('\n🔍 CRITICAL DIAGNOSIS: DATABASE EVENTS ANALYSIS');
    console.log('='.repeat(60));
    console.log('🎯 Goal: Find why mobile app city filtering returns 0 results');
    
    try {
        // Connect to MongoDB
        console.log('\n🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB successfully!');
        
        // Get total count
        const totalEvents = await Event.countDocuments();
        console.log(`📊 Total events in database: ${totalEvents}`);
        
        if (totalEvents === 0) {
            console.log('❌ Database is empty! No events to filter.');
            return;
        }
        
        // Sample a few events to see structure
        console.log('\n📋 SAMPLE EVENT STRUCTURES:');
        const sampleEvents = await Event.find().limit(5).lean();
        
        sampleEvents.forEach((event, index) => {
            console.log(`\n📝 Event ${index + 1}:`);
            console.log(`   Title: ${event.title || 'N/A'}`);
            console.log(`   City: "${event.city || 'N/A'}"`);
            console.log(`   Location: "${event.location || 'N/A'}"`);
            console.log(`   Venue: ${typeof event.venue === 'object' ? JSON.stringify(event.venue) : event.venue || 'N/A'}`);
            console.log(`   Source: ${event.source || 'N/A'}`);
        });
        
        // Analyze city field distribution
        console.log('\n🏙️ CITY FIELD ANALYSIS:');
        const cityStats = await Event.aggregate([
            { $group: { _id: '$city', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        console.log('City field distribution:');
        cityStats.forEach(stat => {
            console.log(`   "${stat._id}": ${stat.count} events`);
        });
        
        // Analyze location field patterns
        console.log('\n📍 LOCATION FIELD ANALYSIS:');
        const locationStats = await Event.aggregate([
            { $group: { _id: '$location', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        
        console.log('Top 10 location field values:');
        locationStats.forEach(stat => {
            console.log(`   "${stat._id}": ${stat.count} events`);
        });
        
        // Check for null/undefined city fields
        const missingCity = await Event.countDocuments({ 
            $or: [
                { city: { $exists: false } },
                { city: null },
                { city: '' },
                { city: 'Unknown' }
            ]
        });
        
        console.log(`\n⚠️ Events with missing/invalid city: ${missingCity}`);
        
        // Test specific city queries (same as mobile app would do)
        console.log('\n🧪 TESTING MOBILE APP CITY FILTERING QUERIES:');
        
        const testCities = ['Toronto', 'Vancouver', 'New York', 'toronto', 'vancouver', 'new york'];
        
        for (const testCity of testCities) {
            const count = await Event.countDocuments({ city: testCity });
            console.log(`   City "${testCity}": ${count} events`);
        }
        
        // Test case-insensitive queries
        console.log('\n🔤 TESTING CASE-INSENSITIVE QUERIES:');
        const caseInsensitiveTests = ['Toronto', 'Vancouver', 'New York'];
        
        for (const testCity of caseInsensitiveTests) {
            const count = await Event.countDocuments({ 
                city: { $regex: new RegExp(`^${testCity}$`, 'i') } 
            });
            console.log(`   City "${testCity}" (case-insensitive): ${count} events`);
        }
        
        // Check venue.city field if it exists
        console.log('\n🏢 TESTING VENUE.CITY FIELD:');
        const venueWithCity = await Event.countDocuments({ 'venue.city': { $exists: true } });
        console.log(`   Events with venue.city field: ${venueWithCity}`);
        
        if (venueWithCity > 0) {
            const venueCityStats = await Event.aggregate([
                { $match: { 'venue.city': { $exists: true } } },
                { $group: { _id: '$venue.city', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]);
            
            console.log('   Venue.city distribution:');
            venueCityStats.forEach(stat => {
                console.log(`      "${stat._id}": ${stat.count} events`);
            });
        }
        
    } catch (error) {
        console.error('❌ Database diagnosis failed:', error.message);
        throw error;
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 MongoDB connection closed');
    }
}

// Run diagnosis
diagnoseDatabaseEvents()
    .then(() => {
        console.log('\n📊 DATABASE DIAGNOSIS COMPLETE!');
        console.log('🔍 Check results above to identify city filtering issues');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Diagnosis failed:', error.message);
        process.exit(1);
    });
