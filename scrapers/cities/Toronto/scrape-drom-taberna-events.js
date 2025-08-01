/**
 * Script to add Drom Taberna Sunfest events to the database
 * Based on events from https://www.dromtaberna.com/sunfest
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

async function addDromTabernaEvents() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB cloud database');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('🎵 Adding Drom Taberna Sunfest events to database...');
    
    // List of Drom Taberna Sunfest events
    const dromTabernaEvents = [
      {
        name: "Antonio Monasterio Ensamble - Sunfest",
        url: "https://www.dromtaberna.com/sunfest",
        imageUrl: "https://images.squarespace-cdn.com/content/v1/59c1871ce3df28c160c5be84/1688582526355-KAQAUP1N2SDEU5NCJ8IR/Drom+Taberna+Sumerfolk",
        description: "Antonio Monasterio Ensamble is a boundary-pushing Chilean group that blends jazz, chamber music, and global rhythms into a deeply emotional and cinematic sound on flugelhorn, electric guitar, oud, drums, bass, and piano. Led by composer and multi-instrumentalist Antonio Monasterio, the ensemble creates rich musical narratives that reflect both the intensity of modern life and the introspection of the natural world.",
        startDate: new Date("2025-07-16T20:00:00.000Z"), // July 16th evening
        endDate: new Date("2025-07-16T23:00:00.000Z"),
        categories: ["Music", "Jazz", "World Music", "Concert", "Toronto"],
        price: "$20-25"
      },
      {
        name: "PS5 Naples Jazz Ensemble - Sunfest",
        url: "https://www.dromtaberna.com/sunfest",
        imageUrl: "https://images.squarespace-cdn.com/content/v1/59c1871ce3df28c160c5be84/1688582526355-KAQAUP1N2SDEU5NCJ8IR/PS5",
        description: "PS5 is led by Pietro Santangelo who was born, lives and plays in Naples. Their compositions are inspired by the idea of natural biodiversity as an expression of contamination, coexistence and balance. Suggestive saxophone textures intertwine on a solid rhythmic equilibrium and move naturally along an imaginary line highlighting the ancestral connection between Africa and the Mediterranean Sea.",
        startDate: new Date("2025-07-17T20:00:00.000Z"), // July 17th evening
        endDate: new Date("2025-07-17T23:00:00.000Z"),
        categories: ["Music", "Jazz", "Mediterranean", "Concert", "Toronto"],
        price: "$20-25"
      },
      {
        name: "Diyet & The Love Soldiers - Sunfest",
        url: "https://www.dromtaberna.com/sunfest",
        imageUrl: "https://images.squarespace-cdn.com/content/v1/59c1871ce3df28c160c5be84/1688582526355-KAQAUP1N2SDEU5NCJ8IR/Diyet",
        description: "Diyet & The Love Soldiers is alternative country, folk, roots and traditional with catchy melodies and stories deeply rooted in Diyet's Indigenous world view and northern life. Diyet sings in both English and Southern Tutchone (her native language) and plays bass guitar. She is backed by The Love Soldiers: husband and collaborator, Robert van Lieshout and Juno Award winning producer, Bob Hamilton.",
        startDate: new Date("2025-07-18T20:00:00.000Z"), // July 18th evening
        endDate: new Date("2025-07-18T23:00:00.000Z"),
        categories: ["Music", "Folk", "Indigenous", "Concert", "Toronto"],
        price: "$20-25"
      },
      {
        name: "Empanadas Ilegales - Sunfest",
        url: "https://www.dromtaberna.com/sunfest",
        imageUrl: "https://images.squarespace-cdn.com/content/v1/59c1871ce3df28c160c5be84/1688582526355-KAQAUP1N2SDEU5NCJ8IR/Empanadas",
        description: "Empanadas Ilegales brings the vibrant rhythms and melodies of Latin America to Toronto's world music scene. This energetic ensemble combines traditional Latin American sounds with contemporary influences for an unforgettable night of music and dancing at Drom Taberna's Sunfest celebration.",
        startDate: new Date("2025-07-19T20:00:00.000Z"), // July 19th evening
        endDate: new Date("2025-07-19T23:00:00.000Z"),
        categories: ["Music", "Latin", "World Music", "Concert", "Toronto"],
        price: "$20-25"
      },
      {
        name: "Sunfest Festival Finale - Global Music Showcase",
        url: "https://www.dromtaberna.com/sunfest",
        imageUrl: "https://images.squarespace-cdn.com/content/v1/59c1871ce3df28c160c5be84/1688582526355-KAQAUP1N2SDEU5NCJ8IR/Finale",
        description: "Join us for the grand finale of Drom Taberna's Sunfest featuring a showcase of global music talent! This special closing night brings together musicians from around the world for a collaborative performance celebrating cultural diversity through music. Experience an unforgettable night of cross-cultural musical exchange in downtown Toronto.",
        startDate: new Date("2025-07-20T19:00:00.000Z"), // July 20th evening
        endDate: new Date("2025-07-20T23:30:00.000Z"),
        categories: ["Music", "Festival", "World Music", "Concert", "Toronto"],
        price: "$25-30"
      }
    ];
    
    let addedCount = 0;
    
    // Create properly formatted events and add to database
    for (const eventData of dromTabernaEvents) {
      const event = {
        id: uuidv4(),
        name: `Toronto - ${eventData.name}`,
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
          name: "Drom Taberna",
          address: "458 Queen St W",
          city: "Toronto",
          state: "Ontario",
          country: "Canada",
          coordinates: {
            lat: 43.6481,
            lng: -79.4015
          }
        },
        price: eventData.price,
        tags: ["live-music", "world-music", "queen-west", "sunfest", "concert"]
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
    
    console.log(`\n📊 Added ${addedCount} new events from Drom Taberna Sunfest`);
    
    // Verify Toronto events count
    const torontoEvents = await eventsCollection.find({
      city: "Toronto"
    }).toArray();
    
    console.log(`📊 Total events with city="Toronto" now: ${torontoEvents.length}`);
    
  } catch (error) {
    console.error('❌ Error adding Drom Taberna events:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
addDromTabernaEvents().catch(console.error);
