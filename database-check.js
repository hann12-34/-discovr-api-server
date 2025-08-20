#!/usr/bin/env node

// Check database directly for Vancouver events
const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function checkDatabase() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db('discovr');
        const collection = db.collection('events');
        
        // Total events
        const totalEvents = await collection.countDocuments();
        console.log(`📊 Total events in DB: ${totalEvents}`);
        
        // Vancouver events - check different city fields
        const vancouverByVenueCity = await collection.countDocuments({'venue.city': 'Vancouver'});
        const vancouverByCity = await collection.countDocuments({'city': 'Vancouver'});
        const vancouverByCityRegex = await collection.countDocuments({'city': /vancouver/i});
        const vancouverByVenueCityRegex = await collection.countDocuments({'venue.city': /vancouver/i});
        
        console.log(`🏙️  Vancouver events by venue.city: ${vancouverByVenueCity}`);
        console.log(`🏙️  Vancouver events by city: ${vancouverByCity}`);
        console.log(`🏙️  Vancouver events by city (regex): ${vancouverByCityRegex}`);
        console.log(`🏙️  Vancouver events by venue.city (regex): ${vancouverByVenueCityRegex}`);
        
        // Sample Vancouver events
        const sampleEvents = await collection.find({
            $or: [
                {'venue.city': 'Vancouver'},
                {'city': 'Vancouver'}
            ]
        }).limit(3).toArray();
        
        console.log('\n📝 Sample Vancouver events:');
        sampleEvents.forEach((event, i) => {
            console.log(`${i+1}. ${event.title}`);
            console.log(`   City: ${event.city}`);
            console.log(`   Venue City: ${event.venue?.city}`);
            console.log(`   Date: ${event.startDate}`);
            console.log('');
        });
        
        // Check for future events
        const now = new Date();
        const futureVancouver = await collection.countDocuments({
            $or: [
                {'venue.city': 'Vancouver'},
                {'city': 'Vancouver'}
            ],
            startDate: { $gte: now }
        });
        
        console.log(`🔮 Future Vancouver events: ${futureVancouver}`);
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
    }
}

checkDatabase();
