/**
 * Test script for Toronto scrapers
 */

// Import MongoDB connection
const { MongoClient } = require('mongodb');
require('dotenv').config();

// Import Toronto scrapers
const torontoScrapers = require('./scrapers/cities/Toronto');

async function testTorontoScrapers() {
    console.log('🧪 Testing Toronto scrapers...');
    
    try {
        // Run all Toronto scrapers
        const events = await torontoScrapers.scrape();
        
        console.log(`📊 Found ${events.length} events from Toronto venues`);
        
        if (events.length > 0) {
            // Show sample event data
            console.log('\n📝 Sample event:');
            const sampleEvent = events[0];
            console.log(JSON.stringify({
                name: sampleEvent.name,
                venue: sampleEvent.venue.name,
                city: sampleEvent.city,
                categories: sampleEvent.categories,
                date: new Date(sampleEvent.startDate).toLocaleString()
            }, null, 2));
            
            // Connect to MongoDB and save events if requested
            if (process.argv.includes('--save')) {
                console.log('\n💾 Saving events to database...');
                await saveToDatabase(events);
            } else {
                console.log('\n💡 Run with --save flag to save events to database');
            }
        }
        
    } catch (error) {
        console.error('❌ Error testing Toronto scrapers:', error);
    }
}

async function saveToDatabase(events) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌ MONGODB_URI not defined in .env file');
        return;
    }
    
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const database = client.db('discovr');
        const eventsCollection = database.collection('events');
        
        // Insert events one by one
        let insertedCount = 0;
        for (const event of events) {
            try {
                // Check if event with same name and venue already exists
                const existingEvent = await eventsCollection.findOne({
                    name: event.name,
                    'venue.name': event.venue.name,
                    startDate: event.startDate
                });
                
                if (existingEvent) {
                    console.log(`⚠️ Event already exists: ${event.name} at ${event.venue.name}`);
                } else {
                    const result = await eventsCollection.insertOne(event);
                    if (result.acknowledged) {
                        insertedCount++;
                    }
                }
            } catch (err) {
                console.error(`❌ Error inserting event: ${event.name}`, err.message);
            }
        }
        
        console.log(`✅ Successfully inserted ${insertedCount} events into database`);
        
    } finally {
        await client.close();
        console.log('📡 Closed MongoDB connection');
    }
}

// Run the test function
testTorontoScrapers();
