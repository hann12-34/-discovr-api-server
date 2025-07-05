/**
 * Simple script to import events from the Roxy scraper directly into MongoDB
 * Uses the direct MongoDB driver to bypass schema validation issues
 */
require('dotenv').config(); // Load environment variables from .env file
const { MongoClient } = require('mongodb');
const roxyScraper = require('./scrapers/roxy-scraper');

// Function to process dates from the scraper format to proper Date objects
function processDate(dateStr) {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Convert "FRIDAY JUNE 27TH" to a proper date
    const dateParts = dateStr.trim().toUpperCase().split(' ');
    if (dateParts.length < 3) return now; // Default to today if format is unexpected
    
    const month = dateParts[1];
    let day = dateParts[2].replace(/[^\d]/g, ''); // Remove non-numeric characters (like TH, ST, ND, RD)
    
    const monthMap = {
      'JANUARY': 0, 'JAN': 0,
      'FEBRUARY': 1, 'FEB': 1,
      'MARCH': 2, 'MAR': 2,
      'APRIL': 3, 'APR': 3,
      'MAY': 4,
      'JUNE': 5, 'JUN': 5,
      'JULY': 6, 'JUL': 6,
      'AUGUST': 7, 'AUG': 7,
      'SEPTEMBER': 8, 'SEP': 8,
      'OCTOBER': 9, 'OCT': 9,
      'NOVEMBER': 10, 'NOV': 10,
      'DECEMBER': 11, 'DEC': 11
    };
    
    const monthNum = monthMap[month];
    if (monthNum === undefined) return now;
    
    // Create the date - using current year
    const eventDate = new Date(currentYear, monthNum, parseInt(day));
    
    // If the date is in the past, assume it's next year
    if (eventDate < now && (now - eventDate > 7 * 24 * 60 * 60 * 1000)) {
      eventDate.setFullYear(currentYear + 1);
    }
    
    return eventDate;
  } catch (error) {
    console.error(`Error parsing date: ${dateStr}`, error);
    return new Date();
  }
}

// Generate a unique ID based on event details
function generateEventId(event) {
  const venueSlug = event.venue.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const titleSlug = event.title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30);
  const dateStr = event.date.replace(/[^A-Z0-9]/g, '').toLowerCase();
  return `${venueSlug}-${titleSlug}-${dateStr}`;
}

// Function to convert from scraper format to MongoDB format
function convertToEventModel(scrapedEvent) {
  const startDate = processDate(scrapedEvent.date);
  const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000); // Assume 3 hours duration
  
  // Format description from event details
  let description = '';
  if (scrapedEvent.time && scrapedEvent.time !== 'N/A') {
    description += `Time: ${scrapedEvent.time}\n`;
  }
  if (scrapedEvent.price && scrapedEvent.price !== 'N/A') {
    description += `Price: ${scrapedEvent.price}`;
  }
  
  return {
    id: generateEventId(scrapedEvent),
    title: scrapedEvent.title,
    description: description.trim(),
    startDate,
    endDate,
    image: "https://images.squarespace-cdn.com/content/v1/5e9cb592cf19070151ba2a9c/1588901284126-HIKOJWNOH4E4SO1L6TRV/TheRoxyNight-1.jpg",
    venue: {
      name: scrapedEvent.venue,
      address: "932 Granville St",
      city: "Vancouver",
      state: "BC",
      country: "Canada",
      coordinates: {
        lat: 49.2798,
        lng: -123.1207
      }
    },
    category: "music",
    categories: ["music", "concert", "live"],
    sourceURL: scrapedEvent.url,
    ticketURL: scrapedEvent.url,
    location: "The Roxy, Vancouver", // Legacy field
    lastUpdated: new Date(),
    source: roxyScraper.sourceIdentifier // Add the source identifier
  };
}

async function importRoxyEvents() {
  let client;
  
  try {
    console.log('Starting Roxy events import...');

    // Connect to MongoDB directly with MongoClient
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in your .env file.');
    }

    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB directly');
    
    // Get database and collection
    const db = client.db('discovr'); // Explicitly use the 'discovr' database
    const eventsCollection = db.collection('events');

    // Scrape events
    console.log('🔍 Scraping events from The Roxy...');
    const events = await roxyScraper.scrape();
    console.log(`Found ${events.length} events at The Roxy.`);

    // Convert events to proper format
    const formattedEvents = events.map(convertToEventModel);
    
    console.log('💾 Importing events to database...');

    // Delete and re-insert events to ensure they are clean and have the correct source
    let newCount = 0;
    console.log('🔄 Deleting and re-inserting events to ensure data integrity...');
    for (const event of formattedEvents) {
      // Delete any existing event that matches title and venue name to ensure a clean slate
      await eventsCollection.deleteOne({
        title: event.title,
        'venue.name': event.venue.name
      });
      
      // Insert the new, clean event which now includes the 'source' field
      await eventsCollection.insertOne(event);
      newCount++;
    }

    console.log(`✅ Import complete! ${newCount} new events added to database.`);
    
    // Check total events
    const totalEvents = await eventsCollection.countDocuments();
    console.log(`Total events in database: ${totalEvents}`);

  } catch (error) {
    console.error('❌ Error importing events:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Disconnected from MongoDB.');
    }
  }
}

// Run the import
importRoxyEvents();
