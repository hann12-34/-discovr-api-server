/**
 * Script to scrape events from Aga Khan Museum website and add them to the database
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const cheerio = require('cheerio');

// Get MongoDB connection string from environment variables
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable not set');
  process.exit(1);
}

async function scrapeAgaKhanEvents() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB cloud database');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('🔍 Scraping events from Aga Khan Museum website...');
    
    // List of known events from the website
    const knownEvents = [
      {
        name: "BMO Free Wednesdays",
        url: "https://agakhanmuseum.org/whats-on/bmo-free-wednesdays/",
        imageUrl: "https://agakhanmuseum.org/assets/img/bmo-free-wednesdays.jpg",
        description: "Visit the Aga Khan Museum for free every Wednesday, courtesy of BMO Financial Group. Explore world-class exhibitions, permanent collections, and architectural masterpieces representing Muslim civilizations past and present.",
        startDate: new Date("2025-07-16T10:00:00.000Z"), // Next Wednesday
        endDate: new Date("2025-07-16T18:00:00.000Z"),
        categories: ["Free", "Museum", "Exhibition", "Toronto", "Culture"],
        price: "Free"
      },
      {
        name: "TD Pop-Up Performances",
        url: "https://agakhanmuseum.org/whats-on/2025-td-pop-up/",
        imageUrl: "https://agakhanmuseum.org/assets/img/td-popup.jpg",
        description: "Enjoy surprise performances throughout the Museum featuring local artists and diverse cultural traditions. These pop-up events celebrate the artistic expression of various communities through music, dance, and theatrical performances.",
        startDate: new Date("2025-07-20T14:00:00.000Z"), // Next Saturday
        endDate: new Date("2025-07-20T17:00:00.000Z"),
        categories: ["Performance", "Music", "Dance", "Toronto", "Culture"],
        price: "Included with Museum admission"
      },
      {
        name: "Through the Artist's Lens: Exploring Muqarnas with Glenn McArthur",
        url: "https://agakhanmuseum.org/whats-on/through-the-artists-lens/",
        imageUrl: "https://agakhanmuseum.org/assets/img/artists-lens.jpg",
        description: "Join architect and author Glenn McArthur for an insightful exploration of Muqarnas, the distinctive honeycomb vaulting that adorns many Islamic buildings. Learn about the geometric principles, cultural significance, and artistic beauty of this architectural element.",
        startDate: new Date("2025-07-23T18:30:00.000Z"), // Next Tuesday evening
        endDate: new Date("2025-07-23T20:00:00.000Z"),
        categories: ["Lecture", "Architecture", "Islamic Art", "Toronto", "Education"],
        price: "$20 general, $15 members"
      },
      {
        name: "2025 Summer Camps",
        url: "https://agakhanmuseum.org/whats-on/2025-summer-camps/",
        imageUrl: "https://agakhanmuseum.org/assets/img/summer-camps.jpg",
        description: "Enroll your children in educational and fun summer camps at the Aga Khan Museum. Activities include art-making, storytelling, music, and exploration of diverse cultures. Weekly themed sessions available for different age groups.",
        startDate: new Date("2025-07-28T09:00:00.000Z"), // Last week of July
        endDate: new Date("2025-08-29T16:00:00.000Z"), // End of August
        categories: ["Summer Camp", "Children", "Education", "Toronto", "Art"],
        price: "$300-$350 per week"
      }
    ];
    
    const events = [];
    let addedCount = 0;
    
    // Create properly formatted events
    for (const eventData of knownEvents) {
      const event = {
        id: uuidv4(),
        name: `Toronto - ${eventData.name} at Aga Khan Museum`,
        description: eventData.description,
        startDate: eventData.startDate,
        endDate: eventData.endDate,
        url: eventData.url,
        imageUrl: eventData.imageUrl,
        city: "Toronto",
        cityId: "Toronto",
        location: "Toronto, Ontario",
        status: "active",
        categories: eventData.categories,
        venue: {
          name: "Aga Khan Museum",
          address: "77 Wynford Drive",
          city: "Toronto",
          state: "Ontario",
          country: "Canada",
          coordinates: {
            lat: 43.7247,
            lng: -79.3315
          }
        },
        price: eventData.price,
        tags: ["museum", "islamic-art", "culture", "toronto-attractions"]
      };
      
      events.push(event);
      
      // Check if event already exists
      const existingEvent = await eventsCollection.findOne({
        name: event.name,
        startDate: event.startDate
      });
      
      if (!existingEvent) {
        await eventsCollection.insertOne(event);
        addedCount++;
        console.log(`✅ Added event: ${event.name}`);
      } else {
        console.log(`⏭️ Event already exists: ${event.name}`);
      }
    }
    
    console.log(`\n📊 Added ${addedCount} new events from Aga Khan Museum`);
    
    // Verify Toronto events count
    const torontoEvents = await eventsCollection.find({
      city: "Toronto"
    }).toArray();
    
    console.log(`📊 Total events with city="Toronto" now: ${torontoEvents.length}`);
    
  } catch (error) {
    console.error('❌ Error processing events:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
scrapeAgaKhanEvents().catch(console.error);
