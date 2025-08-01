/**
 * Script to add Downsview Park events to the database
 * Based on events from https://downsviewpark.ca/events
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const { v4: uuidv4 } = require('uuid');

// Get MongoDB connection string from environment variables
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable not set');
  process.exit(1);
}

async function addDownsviewParkEvents() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB cloud database');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('🌳 Adding Downsview Park events to database...');
    
    // List of Downsview Park events from the website
    const downsviewEvents = [
      {
        name: "Movies Under the Stars 2025",
        url: "https://downsviewpark.ca/events/movies-under-stars",
        imageUrl: "https://downsviewpark.ca/sites/default/files/styles/hero_image/public/2024-05/Revised-Movies-16x9-TITLE.png",
        description: "Movies Under the Stars returns to Downsview Park this year! Our 9th annual movie program will be taking place at the lakeside. Bring a blanket or lawn chair and enjoy family-friendly films under the open sky. Free admission for all!",
        startDate: new Date("2025-07-25T20:30:00.000Z"), // July 25th evening
        endDate: new Date("2025-07-25T23:00:00.000Z"),
        categories: ["Movie", "Outdoor", "Family", "Free", "Toronto"],
        price: "Free",
        recurring: "Every Friday from July to August"
      },
      {
        name: "Wild and Free Family Yoga (ENGLISH)",
        url: "https://downsviewpark.ca/events/wild-and-free-family-yoga-english-1",
        imageUrl: "https://downsviewpark.ca/sites/default/files/styles/hero_image/public/2024-08/Website-Banner-16x9-Yoga-English.png",
        description: "Experience the calming power of yoga while being surrounded by the natural beauty of the Park. This free family yoga program welcomes participants of all ages and abilities. Bring your own mat and water bottle.",
        startDate: new Date("2025-08-23T10:00:00.000Z"), // August 23rd morning
        endDate: new Date("2025-08-23T11:00:00.000Z"),
        categories: ["Yoga", "Wellness", "Family", "Outdoor", "Toronto"],
        price: "Free",
        recurring: "Weekly on Saturdays"
      },
      {
        name: "Wild and Free Family Yoga (FRENCH)",
        url: "https://downsviewpark.ca/events/wild-and-free-family-yoga-french",
        imageUrl: "https://downsviewpark.ca/sites/default/files/styles/hero_image/public/2024-08/Website-Banner-16x9-Yoga-French.png",
        description: "Expérimentez le pouvoir apaisant du yoga tout en étant entouré par la beauté naturelle du parc. Ce programme gratuit de yoga familial accueille les participants de tous âges et de toutes capacités. Apportez votre propre tapis et bouteille d'eau.",
        startDate: new Date("2025-08-30T10:00:00.000Z"), // August 30th morning
        endDate: new Date("2025-08-30T11:00:00.000Z"),
        categories: ["Yoga", "French", "Family", "Outdoor", "Toronto"],
        price: "Free",
        recurring: "Weekly on Saturdays"
      },
      {
        name: "Downsview parkrun",
        url: "https://downsviewpark.ca/events/downsview-parkrun",
        imageUrl: "https://downsviewpark.ca/sites/default/files/styles/hero_image/public/2025-01/parkrun-canada.jpg",
        description: "Parkrun is a free, weekly, timed 5k run/jog/walk every Saturday at 9:00 am. Open to all ages and all abilities – each week a Tail Walker will be present, so you will never be last. This event is organized by parkrun volunteers.",
        startDate: new Date("2025-07-20T13:00:00.000Z"), // July 20th
        endDate: new Date("2025-07-20T14:30:00.000Z"),
        categories: ["Running", "Fitness", "Outdoors", "Community", "Toronto"],
        price: "Free",
        recurring: "Every Saturday at 9:00 AM"
      },
      {
        name: "Jr. Forest Explorers: Creepy Crawlers",
        url: "https://downsviewpark.ca/events/jr-forest-explorers",
        imageUrl: "https://downsviewpark.ca/sites/default/files/styles/hero_image/public/2024-05/JFE-bugs_0.jpg",
        description: "A FREE nature program for toddlers and their guardians. Connect with nature through hands-on outdoor activities focused on discovering the fascinating world of insects and other small creatures. Let's get those little hands dirty!",
        startDate: new Date("2025-07-23T09:30:00.000Z"), // July 23rd morning
        endDate: new Date("2025-07-23T10:30:00.000Z"),
        categories: ["Children", "Nature", "Education", "Outdoors", "Toronto"],
        price: "Free"
      },
      {
        name: "VELD Music Festival",
        url: "https://downsviewpark.ca/events/veld-music-festival-2025",
        imageUrl: "https://downsviewpark.ca/sites/default/files/styles/hero_image/public/2025-05/veld-2025.jpg",
        description: "VELD Music Festival returns to Downsview Park! This premier electronic music festival features world-class DJs and artists performing across multiple stages. Experience amazing performances, festival activities, and an electric atmosphere in one of Toronto's biggest summer music events.",
        startDate: new Date("2025-08-02T16:00:00.000Z"), // August 2-3 weekend
        endDate: new Date("2025-08-04T00:00:00.000Z"),
        categories: ["Music Festival", "Electronic", "Concert", "Entertainment", "Toronto"],
        price: "$150-$300"
      }
    ];
    
    let addedCount = 0;
    
    // Create properly formatted events and add to database
    for (const eventData of downsviewEvents) {
      const event = {
        id: uuidv4(),
        name: `Toronto - ${eventData.name} at Downsview Park`,
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
          name: "Downsview Park",
          address: "70 Canuck Avenue",
          city: "Toronto",
          state: "Ontario",
          country: "Canada",
          coordinates: {
            lat: 43.7334,
            lng: -79.4775
          }
        },
        price: eventData.price,
        tags: ["park", "outdoor", "north-york", "toronto-attractions", "family-friendly"],
        recurring: eventData.recurring || null
      };
      
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
    
    console.log(`\n📊 Added ${addedCount} new events from Downsview Park`);
    
    // Verify Toronto events count
    const torontoEvents = await eventsCollection.find({
      city: "Toronto"
    }).toArray();
    
    console.log(`📊 Total events with city="Toronto" now: ${torontoEvents.length}`);
    
  } catch (error) {
    console.error('❌ Error adding Downsview Park events:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
addDownsviewParkEvents().catch(console.error);
