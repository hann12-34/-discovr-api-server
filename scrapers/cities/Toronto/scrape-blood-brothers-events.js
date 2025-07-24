/**
 * Script to add Blood Brothers Brewing events to the database
 * Based on information from https://www.bloodbrothersbrewing.com/
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

async function addBloodBrothersEvents() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB cloud database');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('🍺 Adding Blood Brothers Brewing events to database...');
    
    // List of Blood Brothers Brewing events
    const bloodBrothersEvents = [
      {
        name: "Craft Beer Tasting Night at Blood Brothers",
        url: "https://www.bloodbrothersbrewing.com/pages/tap-room",
        imageUrl: "https://cdn.shopify.com/s/files/1/0517/5811/4339/files/Group_2000x1000_crop_center.png",
        description: "Join us for a special craft beer tasting night at Blood Brothers Brewery! Sample a selection of our 26 beers on tap, including seasonal specialties and brewery exclusives. Our beer experts will guide you through the tasting, explaining the brewing process and unique flavor profiles of each beer. Perfect for craft beer enthusiasts and curious newcomers alike.",
        startDate: new Date("2025-07-25T18:00:00.000Z"), // July 25th evening
        endDate: new Date("2025-07-25T22:00:00.000Z"),
        categories: ["Beer", "Tasting", "Craft Brewery", "Food", "Toronto"],
        price: "$25 (includes flight of 5 beer samples)",
        recurring: "Monthly, last Friday"
      },
      {
        name: "Southern Smoke: BBQ & Beer Pairing",
        url: "https://www.bloodbrothersbrewing.com/pages/blood-brothers-food",
        imageUrl: "https://cdn.shopify.com/s/files/1/0517/5811/4339/files/Group_2000x1000_crop_center.png",
        description: "Experience the perfect marriage of craft beer and southern BBQ at Blood Brothers Brewery. Our kitchen serves up 'Southern Comfort' dishes with all meats smoked in-house using oak staves from the very barrels we age our beer in. This special pairing event features a curated menu with recommended beer pairings to highlight the complementary flavors.",
        startDate: new Date("2025-08-08T17:00:00.000Z"), // August 8th evening
        endDate: new Date("2025-08-08T23:00:00.000Z"),
        categories: ["Beer", "Food", "Craft Brewery", "BBQ", "Toronto"],
        price: "$40 (includes food and beer pairings)",
        recurring: "Monthly, second Friday"
      },
      {
        name: "New Release Party: Summer Sours Series",
        url: "https://www.bloodbrothersbrewing.com/",
        imageUrl: "https://cdn.shopify.com/s/files/1/0517/5811/4339/files/Group_2000x1000_crop_center.png",
        description: "Be among the first to taste Blood Brothers Brewing's new Summer Sours Series! This exclusive release party celebrates our limited-edition seasonal sours, featuring fruited varieties perfect for warm weather. Meet our brewers, learn about the souring process, and enjoy complimentary appetizers from our Southern Comfort kitchen with your ticket purchase.",
        startDate: new Date("2025-08-15T18:00:00.000Z"), // August 15th evening
        endDate: new Date("2025-08-15T23:00:00.000Z"),
        categories: ["Beer", "Release Party", "Craft Brewery", "Sour Beer", "Toronto"],
        price: "$30"
      },
      {
        name: "Geary Avenue Summer Block Party",
        url: "https://www.bloodbrothersbrewing.com/",
        imageUrl: "https://cdn.shopify.com/s/files/1/0517/5811/4339/files/Group_2000x1000_crop_center.png",
        description: "Join the annual Geary Avenue Summer Block Party hosted at Blood Brothers Brewery! Celebrate Toronto's coolest street with local vendors, food trucks, live music, and plenty of craft beer. Our spacious patio and renovated historic taproom will be the center of the festivities. A family-friendly afternoon transforms into an evening block party for adults.",
        startDate: new Date("2025-08-23T16:00:00.000Z"), // August 23rd afternoon
        endDate: new Date("2025-08-24T02:00:00.000Z"), // Until 2am
        categories: ["Festival", "Beer", "Community", "Music", "Toronto"],
        price: "Free entry (pay as you go for food and drinks)"
      },
      {
        name: "Barrel-Aged Beer Workshop",
        url: "https://www.bloodbrothersbrewing.com/pages/tap-room",
        imageUrl: "https://cdn.shopify.com/s/files/1/0517/5811/4339/files/Group_2000x1000_crop_center.png",
        description: "Discover the art of barrel-aging beer at this educational workshop hosted by Blood Brothers Brewing. Learn how different barrels impart unique flavors to various beer styles, the aging process, and the science behind it. Includes a guided tasting of five barrel-aged beers and take-home tasting notes. Limited spots available for this intimate learning experience.",
        startDate: new Date("2025-09-12T18:30:00.000Z"), // Sept 12th evening
        endDate: new Date("2025-09-12T21:00:00.000Z"),
        categories: ["Workshop", "Beer", "Education", "Craft Brewery", "Toronto"],
        price: "$45 (includes guided tasting)"
      }
    ];
    
    let addedCount = 0;
    
    // Create properly formatted events and add to database
    for (const eventData of bloodBrothersEvents) {
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
          name: "Blood Brothers Brewing",
          address: "165 Geary Ave",
          city: "Toronto",
          state: "Ontario",
          country: "Canada",
          coordinates: {
            lat: 43.6734,
            lng: -79.4381
          }
        },
        price: eventData.price,
        tags: ["craft-beer", "brewery", "geary-avenue", "local-business"]
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
    
    console.log(`\n📊 Added ${addedCount} new events from Blood Brothers Brewing`);
    
    // Verify Toronto events count
    const torontoEvents = await eventsCollection.find({
      city: "Toronto"
    }).toArray();
    
    console.log(`📊 Total events with city="Toronto" now: ${torontoEvents.length}`);
    
  } catch (error) {
    console.error('❌ Error adding Blood Brothers Brewing events:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
addBloodBrothersEvents().catch(console.error);
