const { getCityFromArgs } = require('../../utils/city-util.js');
/**
 * Script to verify the quality of Commodore Ballroom events in the database
 * Checks for proper titles, subtitles, and descriptions
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });
const mongoose = require('mongoose');

async function verifyCommodoreEvents() {
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
    
    const events = await Event.find({ 
      'venue.name': 'Commodore Ballroom'
    }).sort({ startDate: 1 });
    
    console.log(`✅ Found ${events.length} Commodore Ballroom events`);

    if (events.length > 0) {
      console.log('\n📊 EVENT QUALITY REPORT');
      console.log('=====================');
      
      // Check for events with subtitles
      const eventsWithSubtitles = events.filter(e => e.subtitle);
      console.log(`Events with subtitles: ${eventsWithSubtitles.length}/${events.length} (${Math.round(eventsWithSubtitles.length/events.length*100)}%)`);
      
      // Check for events with proper descriptions
      const eventsWithGoodDescriptions = events.filter(e => 
        e.description && 
        e.description.includes('Commodore Ballroom') && 
        e.description.length > 50
      );
      console.log(`Events with good descriptions: ${eventsWithGoodDescriptions.length}/${events.length} (${Math.round(eventsWithGoodDescriptions.length/events.length*100)}%)`);
      
      // Check for events with proper venue info
      const eventsWithProperVenue = events.filter(e => 
        e.venue && 
        e.venue.name === 'Commodore Ballroom' &&
        e.venue.city === 'Vancouver' &&
        e.venue.state === 'BC' &&
        e.venue.country === 'Canada'
      );
      console.log(`Events with proper venue info: ${eventsWithProperVenue.length}/${events.length} (${Math.round(eventsWithProperVenue.length/events.length*100)}%)`);
      
      // Check for events with images
      const eventsWithImages = events.filter(e => e.image && e.image.length > 0);
      console.log(`Events with images: ${eventsWithImages.length}/${events.length} (${Math.round(eventsWithImages.length/events.length*100)}%)`);
      
      // Display s
      console.log('\n📝 S');
      console.log('==============');
      
      // Show a few events with subtitles
      if (eventsWithSubtitles.length > 0) {
        console.log('\nEvents with subtitles:');
        eventsWithSubtitles.slice(0, 5).forEach((event, i) => {
          console.log(`\n${i+1}. ${event.title}`);
          console.log(`   Subtitle: ${event.subtitle}`);
          console.log(`   Date: ${new Date(event.startDate).toLocaleDateString()}`);
          console.log(`   Description: ${event.description.substring(0, 100)}...`);
        });
      }
      
      // Show a few events without subtitles
      const eventsWithoutSubtitles = events.filter(e => !e.subtitle);
      if (eventsWithoutSubtitles.length > 0) {
        console.log('\nEvents without subtitles:');
        eventsWithoutSubtitles.slice(0, 5).forEach((event, i) => {
          console.log(`\n${i+1}. ${event.title}`);
          console.log(`   Date: ${new Date(event.startDate).toLocaleDateString()}`);
          console.log(`   Description: ${event.description.substring(0, 100)}...`);
        });
      }
      
      // List all events
      console.log('\n📋 ALL COMMODORE BALLROOM EVENTS');
      console.log('=============================');
      events.forEach((event, i) => {
        console.log(`${i+1}. ${event.title}${event.subtitle ? ` - ${event.subtitle}` : ''} (${new Date(event.startDate).toLocaleDateString()})`);
      });
      
    } else {
      console.log('❌ No Commodore Ballroom events found in database');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

verifyCommodoreEvents().catch(console.error);
