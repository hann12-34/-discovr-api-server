/**
 * Script to add Commodore Ballroom events to the database
 * This script runs the Commodore Ballroom scraper and adds the scraped events to the database
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });
const mongoose = require('mongoose');
const { v5: uuidv5 } = require('uuid');

// Namespace for deterministic UUIDs
const NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341';

async function addCommodoreEventsToDB() {
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

    // Import and run the Commodore Ballroom scraper
    const CommodoreBallroomEvents = require('./scrapers/cities/vancouver/commodoreBallroomEvents');
    const events = await CommodoreBallroomEvents.scrape();

    console.log(`✅ Found ${events.length} events from Commodore Ballroom`);

    // Add events to database
    let newEventsCount = 0;

    for (const event of events) {
      // Generate a deterministic UUID based on event details
      const sourceURL = event.url;
      const idString = `${event.title}|${event.startDate}|${event.venue}|commodore-ballroom-vancouver`;
      const id = uuidv5(idString, NAMESPACE);
      
      // Extract subtitle if title contains a colon or dash
      let title = event.title;
      let subtitle = null;
      
      // Special cases for event titles with specific formats
      if (title.includes(' w/ ')) {
        // Handle "Main Artist w/ Supporting Artist" format
        const parts = title.split(' w/ ');
        title = parts[0].trim();
        subtitle = `with ${parts.slice(1).join(' w/ ').trim()}`;
      } else if (title.includes(' with ')) {
        // Handle "Main Artist with Supporting Artist" format
        const parts = title.split(' with ');
        title = parts[0].trim();
        subtitle = `with ${parts.slice(1).join(' with ').trim()}`;
      } else if (title.includes(': ')) {
        // Handle "Artist: Tour Name" format
        const parts = title.split(': ');
        title = parts[0].trim();
        subtitle = parts.slice(1).join(': ').trim();
      } else if (title.includes(' - ')) {
        // Handle "Artist - Tour Name" format
        const parts = title.split(' - ');
        title = parts[0].trim();
        subtitle = parts.slice(1).join(' - ').trim();
      }
      
      // Generate a proper description
      let description;
      if (subtitle) {
        description = `${title} presents "${subtitle}" at the Commodore Ballroom in Vancouver, BC on ${new Date(event.startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. Get tickets and more information at the official event page.`;
      } else {
        description = `${title} performing live at the Commodore Ballroom in Vancouver, BC on ${new Date(event.startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. Get tickets and more information at the official event page.`;
      }
      
      // Format the event to match the database schema
      const formattedEvent = {
        id: id,
        title: title,
        subtitle: subtitle,
        description: description,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate),
        image: event.imageUrl,
        venue: {
          name: 'Commodore Ballroom',
          address: '868 Granville St',
          city: 'Vancouver',
          state: 'BC',
          country: 'Canada'
        },
        sourceURL: sourceURL,
        officialWebsite: sourceURL,
        dataSources: ['vancouver-commodore-ballroom'],
        lastUpdated: new Date()
      };

      // Check if event already exists
      const existingEvent = await Event.findOne({ sourceURL: sourceURL });

      if (!existingEvent) {
        // Add new event
        await Event.create(formattedEvent);
        newEventsCount++;
      }
    }

    console.log(`✅ Saved ${newEventsCount} new events from Commodore Ballroom to database`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

addCommodoreEventsToDB().catch(console.error);
