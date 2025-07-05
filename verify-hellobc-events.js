/**
 * Script to verify HelloBC events in the database
 * This script checks if HelloBC events have been properly added to the database
 * with all required fields and proper formatting
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });
const mongoose = require('mongoose');

async function verifyHelloBCEvents() {
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

    // Find HelloBC events in the database
    const events = await Event.find({ 
      id: { $regex: '^hellobc-' }
    });

    console.log(`\n🔍 Found ${events.length} HelloBC events in the database\n`);

    if (events.length === 0) {
      console.log('❌ No HelloBC events found in the database');
      return;
    }

    // Verify each event
    let validEvents = 0;
    let issuesFound = 0;

    for (const event of events) {
      console.log(`\n📋 Verifying event: ${event.title}`);
      let eventValid = true;
      
      // Check required fields
      if (!event.id) {
        console.log('❌ Missing ID');
        eventValid = false;
        issuesFound++;
      }
      
      if (!event.title) {
        console.log('❌ Missing title');
        eventValid = false;
        issuesFound++;
      }
      
      if (!event.description || event.description.length < 100) {
        console.log('❌ Missing or too short description');
        eventValid = false;
        issuesFound++;
      }
      
      if (!event.startDate) {
        console.log('❌ Missing start date');
        eventValid = false;
        issuesFound++;
      }
      
      if (!event.venue || !event.venue.name) {
        console.log('❌ Missing venue information');
        eventValid = false;
        issuesFound++;
      }
      
      if (!event.image) {
        console.log('⚠️ No image URL (not critical but recommended)');
      }
      
      if (!event.categories || event.categories.length === 0) {
        console.log('⚠️ No categories (not critical but helpful for filtering)');
      }
      
      // Check if ID follows expected format
      if (event.id && !event.id.startsWith('hellobc-')) {
        console.log('⚠️ ID does not follow expected format (should start with "hellobc-")');
      }
      
      // Print event details
      console.log(`ID: ${event.id}`);
      console.log(`Title: ${event.title}`);
      console.log(`Description: ${event.description.substring(0, 100)}...`);
      console.log(`Start Date: ${event.startDate}`);
      console.log(`End Date: ${event.endDate || 'Not specified'}`);
      console.log(`Venue: ${event.venue ? event.venue.name : 'Not specified'}`);
      console.log(`Categories: ${event.categories ? event.categories.join(', ') : 'None'}`);
      console.log(`Image: ${event.image || 'None'}`);
      
      if (eventValid) {
        console.log('✅ Event is valid');
        validEvents++;
      } else {
        console.log('❌ Event has issues');
      }
    }
    
    // Print summary
    console.log(`\n📊 Summary:`);
    console.log(`Total HelloBC events: ${events.length}`);
    console.log(`Valid events: ${validEvents}`);
    console.log(`Events with issues: ${events.length - validEvents}`);
    console.log(`Total issues found: ${issuesFound}`);
    
    if (validEvents === events.length) {
      console.log('\n✅ All HelloBC events are valid!');
    } else {
      console.log('\n⚠️ Some HelloBC events have issues that need to be fixed');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

verifyHelloBCEvents().catch(console.error);
