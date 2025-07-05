/**
 * Script to check the quality of Commodore Ballroom events in the database
 * Specifically focuses on titles and descriptions
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });
const mongoose = require('mongoose');

async function checkCommodoreEvents() {
  // Connect to MongoDB
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in environment variables');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Import Event model
    const Event = require('./models/Event');

    // Find all Commodore Ballroom events
    console.log('🔍 Finding all Commodore Ballroom events...');
    
    const query = {
      $or: [
        { 'venue.name': { $regex: /commodore ballroom/i } },
        { dataSources: { $in: ['vancouver-commodore-ballroom'] } }
      ]
    };
    
    const events = await Event.find(query).sort({ startDate: 1 });
    console.log(`✅ Found ${events.length} Commodore Ballroom events`);

    if (events.length > 0) {
      console.log('\n📊 TITLE AND DESCRIPTION QUALITY CHECK');
      console.log('=====================================');
      
      // Check for duplicate titles
      const titles = events.map(e => e.title);
      const uniqueTitles = new Set(titles);
      console.log(`Total events: ${events.length}`);
      console.log(`Unique titles: ${uniqueTitles.size}`);
      console.log(`Duplicate titles: ${events.length - uniqueTitles.size}`);
      
      // Check for titles with common prefixes that should have been removed
      const problematicPrefixes = ['Club Level Seating:', 'Suites', 'Ball Suites'];
      const eventsWithProblematicTitles = events.filter(e => 
        problematicPrefixes.some(prefix => e.title.includes(prefix))
      );
      
      if (eventsWithProblematicTitles.length > 0) {
        console.log(`\n⚠️ Found ${eventsWithProblematicTitles.length} events with problematic titles:`);
        eventsWithProblematicTitles.forEach((e, i) => {
          if (i < 10) { // Show only first 10 examples
            console.log(`  - "${e.title}"`);
          }
        });
        if (eventsWithProblematicTitles.length > 10) {
          console.log(`  ... and ${eventsWithProblematicTitles.length - 10} more`);
        }
      } else {
        console.log('✅ No events with problematic titles found');
      }
      
      // Check for generic descriptions
      const genericDescriptions = events.filter(e => 
        !e.description || 
        e.description === `Event at ${e.venue?.name}` ||
        e.description.length < 20
      );
      
      if (genericDescriptions.length > 0) {
        console.log(`\n⚠️ Found ${genericDescriptions.length} events with generic/missing descriptions:`);
        genericDescriptions.forEach((e, i) => {
          if (i < 10) { // Show only first 10 examples
            console.log(`  - "${e.title}": "${e.description || 'No description'}"`);
          }
        });
        if (genericDescriptions.length > 10) {
          console.log(`  ... and ${genericDescriptions.length - 10} more`);
        }
      } else {
        console.log('✅ No events with generic descriptions found');
      }
      
      // Sample of events to review
      console.log('\n📝 SAMPLE EVENTS FOR REVIEW');
      console.log('=========================');
      const sampleSize = Math.min(10, events.length);
      const sampleEvents = events
        .sort(() => 0.5 - Math.random()) // Shuffle array
        .slice(0, sampleSize);
      
      sampleEvents.forEach((event, i) => {
        console.log(`\nEvent ${i+1}/${sampleSize}:`);
        console.log(`Title: ${event.title}`);
        console.log(`Date: ${new Date(event.startDate).toLocaleDateString()}`);
        console.log(`Description: ${event.description}`);
        console.log(`Venue: ${event.venue?.name}`);
        console.log(`Source URL: ${event.sourceURL}`);
      });
    } else {
      console.log('ℹ️ No Commodore Ballroom events found in database');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkCommodoreEvents().catch(console.error);
