/**
 * Import Commodore Events Script
 * 
 * This script runs the Commodore Ballroom scraper and imports events to MongoDB
 */
require('dotenv').config();
const { MongoClient } = require('mongodb');
const commodoreScraper = require('./scrapers/commodore-scraper');

// MongoDB connection string from .env file
const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/discovr?retryWrites=true&w=majority&appName=Discovr';

async function importCommodoreEvents() {
    console.log('📊 Starting Commodore Ballroom event import...');
    console.log(`🔌 Connecting to MongoDB at ${mongoUri.substring(0, 20)}...`);
    
    let client;
    
    try {
        // Connect to MongoDB
        client = new MongoClient(mongoUri);
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db();
        const collection = db.collection('events');
        
        // Run the Commodore Ballroom scraper
        console.log('🔍 Running Commodore Ballroom scraper...');
        const events = await commodoreScraper.scrape();
        
        if (!events || events.length === 0) {
            console.log('⚠️ No events found or scraper returned empty array');
            return;
        }
        
        console.log(`📋 Found ${events.length} events from Commodore Ballroom`);
        
        // Check for existing events to avoid duplicates
        console.log('🔍 Checking for duplicates...');
        const newEvents = [];
        
        for (const event of events) {
            // Look for existing event with same title and date
            const existingEvent = await collection.findOne({
                'title': event.title,
                'startDate': event.startDate
            });
            
            if (!existingEvent) {
                newEvents.push(event);
            }
        }
        
        console.log(`📋 ${newEvents.length} new events to add (${events.length - newEvents.length} duplicates skipped)`);
        
        if (newEvents.length > 0) {
            // Insert new events
            const result = await collection.insertMany(newEvents);
            console.log(`✅ Successfully inserted ${result.insertedCount} events`);
        } else {
            console.log('ℹ️ No new events to add');
        }
    } catch (error) {
        console.error('❌ Error importing events:', error);
    } finally {
        if (client) {
            await client.close();
            console.log('🔌 MongoDB connection closed');
        }
    }
}

// Run the import function
importCommodoreEvents().catch(console.error);
