/**
 * Script to add Mascot Brewery events to the database
 * Based on events from https://mascotbrewery.com/pages/upcoming-events
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

async function addMascotBreweryEvents() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB cloud database');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('🍺 Adding Mascot Brewery events to database...');
    
    // List of Mascot Brewery events
    const mascotBreweryEvents = [
      {
        name: "Mascot Playdate: Kids Tie-Dye Workshop",
        url: "https://mascotbrewery.com/blogs/upcoming-events/mascot-playdate-kids-tie-dye-workshop",
        imageUrl: "https://cdn.shopify.com/s/files/1/0590/7537/2641/files/kids-tie-dye.jpg",
        description: "A 60-minute Kids Tie-Dye workshop at Mascot Brewery's Etobicoke location! Children ages 6-12 will transform plain white t-shirts into vibrant masterpieces in this hands-on, creative workshop. Participants will learn basic tie-dye techniques, colour theory, and pattern creation. The workshop includes all necessary materials: a white cotton t-shirt, professional-grade fabric dyes, supplies, step-by-step instruction, and take-home care instructions. Parents can enjoy food and drinks at the brewery while their kids participate in this fun, creative activity.",
        startDate: new Date("2025-06-29T15:00:00.000Z"), // June 29, 2025, 11:00 AM EDT
        endDate: new Date("2025-06-29T17:00:00.000Z"), // June 29, 2025, 1:00 PM EDT
        categories: ["Workshop", "Family", "Kids", "Arts", "Toronto"],
        price: "Tickets required",
        venue: {
          name: "Mascot Brewery - Etobicoke",
          address: "37 Advance Road",
          city: "Toronto",
          state: "Ontario",
          country: "Canada",
          coordinates: {
            lat: 43.6510,
            lng: -79.5260
          }
        }
      },
      {
        name: "Canada Day Summer Patio Party",
        url: "https://mascotbrewery.com/blogs/upcoming-events/home-opener-canada-day-summer-patio-party",
        imageUrl: "https://cdn.shopify.com/s/files/1/0590/7537/2641/files/summer-patio-party.jpg",
        description: "Join Mascot Brewery for their official summer patio and beer garden kick-off party celebrating Canada Day weekend! This sunny day party features drink specials, delicious food, beer buckets, DJs, local vendors, and more. Taking place at both King St and Etobicoke locations, choose between a chill vibe in the suburbs or a more amplified experience downtown. Free entry with RSVP to guarantee your spot at either location. Come celebrate summer in Toronto with good drinks, food, music, and vibes!",
        startDate: new Date("2025-06-28T16:00:00.000Z"), // June 28, 2025, 12:00 PM EDT
        endDate: new Date("2025-06-29T02:00:00.000Z"), // June 28, 2025, 10:00 PM EDT
        categories: ["Party", "Beer", "Patio", "Music", "Toronto"],
        price: "Free with RSVP",
        venue: {
          name: "Mascot Brewery - Multiple Locations",
          address: "220 King St W & 37 Advance Road",
          city: "Toronto",
          state: "Ontario",
          country: "Canada",
          coordinates: {
            lat: 43.6479,
            lng: -79.3893
          }
        }
      },
      {
        name: "Trivia Night at Mascot Brewery",
        url: "https://mascotbrewery.com/blogs/upcoming-events/trivia-night-at-etobicoke",
        imageUrl: "https://cdn.shopify.com/s/files/1/0590/7537/2641/files/trivia-night.jpg",
        description: "Put your knowledge to the test at Mascot Brewery's weekly Trivia Night! Hosted by the incredible team at Tremendous Trivia, this event features questions spanning pop culture, history, sports stats, and more. Gather your smartest friends, enjoy craft beers and delicious food, and compete for brewery prizes and bragging rights. Tables fill up quickly, so reservations are recommended for this popular weekly event at Mascot's Etobicoke location.",
        startDate: new Date("2025-07-15T23:00:00.000Z"), // July 15, 2025, 7:00 PM EDT
        endDate: new Date("2025-07-16T01:00:00.000Z"), // July 15, 2025, 9:00 PM EDT
        categories: ["Games", "Beer", "Trivia", "Social", "Toronto"],
        price: "Free to participate",
        recurring: "Weekly on Tuesdays",
        venue: {
          name: "Mascot Brewery - Etobicoke",
          address: "37 Advance Road",
          city: "Toronto",
          state: "Ontario",
          country: "Canada",
          coordinates: {
            lat: 43.6510,
            lng: -79.5260
          }
        }
      },
      {
        name: "Crates & Crafts - DJ Night",
        url: "https://mascotbrewery.com/blogs/upcoming-events/crates-crafts",
        imageUrl: "https://cdn.shopify.com/s/files/1/0590/7537/2641/files/crates-and-crafts.jpg",
        description: "Experience Mascot Brewery's weekly curated DJ night, Crates & Crafts! Every Friday at their Etobicoke location, enjoy a chill craft beer experience featuring some of Toronto's hottest DJs spinning all the classics from old soul, hip-hop, funk, R&B, and everything in between. This nostalgic evening combines great music with exceptional craft beer in a relaxed atmosphere. Perfect for unwinding after the work week with friends, good vibes, and great sounds. Reservations recommended as this popular event tends to fill up quickly.",
        startDate: new Date("2025-07-18T23:00:00.000Z"), // July 18, 2025, 7:00 PM EDT
        endDate: new Date("2025-07-19T03:00:00.000Z"), // July 18, 2025, 11:00 PM EDT
        categories: ["Music", "Beer", "DJ", "Nightlife", "Toronto"],
        price: "No cover charge",
        recurring: "Weekly on Fridays",
        venue: {
          name: "Mascot Brewery - Etobicoke",
          address: "37 Advance Road",
          city: "Toronto",
          state: "Ontario",
          country: "Canada",
          coordinates: {
            lat: 43.6510,
            lng: -79.5260
          }
        }
      }
    ];
    
    let addedCount = 0;
    
    // Create properly formatted events and add to database
    for (const eventData of mascotBreweryEvents) {
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
        venue: eventData.venue,
        price: eventData.price,
        tags: ["craft-beer", "brewery", "taproom", "local-business", "food"]
      };
      
      // Add recurring field if it exists
      if (eventData.recurring) {
        event.recurring = eventData.recurring;
      }
      
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
    
    console.log(`\n📊 Added ${addedCount} new events from Mascot Brewery`);
    
    // Verify Toronto events count
    const torontoEvents = await eventsCollection.find({
      city: "Toronto"
    }).toArray();
    
    console.log(`📊 Total events with city="Toronto" now: ${torontoEvents.length}`);
    
  } catch (error) {
    console.error('❌ Error adding Mascot Brewery events:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
addMascotBreweryEvents().catch(console.error);
