/**
 * Import script for Twelve West events
 * 
 * This script runs the Twelve West scraper and imports the events into MongoDB
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { scrape } = require('./scrapers/twelvewest-scraper');
const Event = require('./models/Event');

async function importEvents() {
  console.log('📊 Starting Twelve West event import...');
  
  try {
    // Connect to MongoDB
    console.log(`🔌 Connecting to MongoDB at ${process.env.MONGODB_URI.substring(0, 20)}...`);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Run the scraper
    console.log('🔍 Running Twelve West scraper...');
    const events = await scrape();
    
    console.log(`📋 Found ${events.length} events from Twelve West`);
    
    if (events.length === 0) {
      console.log('No events found to import.');
      return;
    }
    
    // Check for duplicates and insert new events
    console.log('🔍 Checking for duplicates...');
    let newCount = 0;
    let duplicateCount = 0;
    let skippedCount = 0;
    
    const validEvents = events.filter(event => {
      // Validate event data before insertion
      if (!event.title || event.title.trim().length < 2) {
        console.log('⚠️ Skipping event with invalid title');
        skippedCount++;
        return false;
      }
      
      if (!event.startDate) {
        console.log(`⚠️ Skipping event with missing date: "${event.title}"`);
        skippedCount++;
        return false;
      }
      
      return true;
    });
    
    console.log(`📋 ${validEvents.length} valid events to process (${skippedCount} invalid events skipped)`);
    
    for (const event of validEvents) {
      // Check if this event already exists in the database
      const existing = await Event.findOne({
        'venue.name': event.venue.name,
        title: event.title,
        startDate: {
          $gte: new Date(new Date(event.startDate).setHours(0, 0, 0, 0)),
          $lt: new Date(new Date(event.startDate).setHours(23, 59, 59, 999))
        }
      });
      
      if (existing) {
        console.log(`♻️ Skipping duplicate event: "${event.title}" on ${event.startDate.toLocaleDateString()}`);
        duplicateCount++;
      } else {
        // Insert the new event
        await Event.create(event);
        console.log(`➕ Inserted new event: "${event.title}" on ${event.startDate.toLocaleDateString()}`);
        newCount++;
      }
    }
    
    console.log(`📋 ${newCount} new events to add (${duplicateCount} duplicates skipped)`);
    
    if (newCount > 0) {
      console.log(`✅ Successfully inserted ${newCount} events`);
    }
    
  } catch (error) {
    console.error(`❌ Error importing Twelve West events: ${error.message}`);
    console.error(error.stack);
  } finally {
    // Close the MongoDB connection
    await mongoose.disconnect();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the import function
importEvents();
