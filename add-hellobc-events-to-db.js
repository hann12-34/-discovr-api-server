/**
 * Script to add HelloBC events to the database
 * Uses the HelloBC events scraper to get event data
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });
const mongoose = require('mongoose');
const crypto = require('crypto');
const helloBCEventsScraper = require('./scrapers/cities/vancouver/helloBCEvents');

async function addHelloBCEventsToDB() {
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

    // Scrape events from HelloBC
    console.log('🔍 Getting events from HelloBC...');
    const events = await helloBCEventsScraper.scrape();
    console.log(`✅ Found ${events.length} events from HelloBC`);

    // Add events to database
    let newEventsCount = 0;

    for (const event of events) {
      // Check if event already exists by source URL
      const existingEvent = await Event.findOne({ 
        sourceURL: event.sourceURL,
        title: event.title,
        startDate: event.startDate
      });

      if (existingEvent) {
        console.log(`⏩ Event already exists: ${event.title}`);
        continue;
      }

      // Generate a unique ID based on event details
      const idString = `${event.title}-${event.startDate.toISOString()}-${event.venue.name}`;
      const hash = crypto.createHash('md5').update(idString).digest('hex');
      const uniqueId = `hellobc-${hash}`;
      
      // Create new event
      const newEvent = new Event({
        id: uniqueId,
        title: event.title,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        venue: event.venue,
        categories: event.categories,
        sourceURL: event.sourceURL,
        ticketURL: event.officialWebsite, // Use ticketURL field for the official website
        image: event.image,
        lastUpdated: new Date()
      });

      // Save event to database
      await newEvent.save();
      console.log(`✅ Added event: ${event.title}`);
      newEventsCount++;
    }

    console.log(`✅ Saved ${newEventsCount} new events from HelloBC to database`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

addHelloBCEventsToDB().catch(console.error);
