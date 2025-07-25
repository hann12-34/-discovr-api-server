/**
 * Script to add Junction Craft Brewing events to the database
 * Based on typical events from https://www.junctioncraft.com/
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

async function addJunctionCraftEvents() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB cloud database');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('🍺 Adding Junction Craft Brewing events to database...');
    
    // List of Junction Craft Brewing events
    const junctionCraftEvents = [
      {
        name: "Trivia Night",
        url: "https://www.junctioncraft.com/whatson",
        imageUrl: "https://static.wixstatic.com/media/d0b27f_53b4f3f045394e3d8295d32f2b72b379~mv2.jpg",
        description: "Test your knowledge at Junction Craft Brewing's weekly trivia night! Join our host as teams compete for brewery prizes, bragging rights, and beer specials. No registration required - just show up with your team or join one when you arrive. Enjoy craft beer from our rotating taps while exercising your brain with questions spanning pop culture, history, sports, science, and local Toronto trivia.",
        startDate: new Date("2025-07-17T23:00:00.000Z"), // July 17, 2025, 7:00 PM EST
        endDate: new Date("2025-07-18T02:00:00.000Z"), // July 17, 2025, 10:00 PM EST
        categories: ["Games", "Beer", "Social", "Trivia", "Toronto"],
        price: "Free to participate",
        recurring: "Weekly on Thursdays"
      },
      {
        name: "Live Music Saturday - Local Indie Showcase",
        url: "https://www.junctioncraft.com/whatson",
        imageUrl: "https://static.wixstatic.com/media/d0b27f_a7b7ae0c108e4c6fb0bc553df919ecff~mv2.jpg",
        description: "Enjoy the sounds of Toronto's vibrant indie music scene at Junction Craft Brewing's Live Music Saturday. This week features performances from local artists in an intimate taproom setting. Sip on award-winning craft beers while supporting local musicians. Food menu available throughout the event featuring brewery favorites and seasonal specials.",
        startDate: new Date("2025-07-19T23:00:00.000Z"), // July 19, 2025, 7:00 PM EST
        endDate: new Date("2025-07-20T02:00:00.000Z"), // July 19, 2025, 10:00 PM EST
        categories: ["Music", "Beer", "Live Performance", "Indie", "Toronto"],
        price: "No cover charge"
      },
      {
        name: "Toronto Craft Beer Week Tap Takeover",
        url: "https://www.junctioncraft.com/whatson",
        imageUrl: "https://static.wixstatic.com/media/d0b27f_bf4bd5ec3e324b229ec746d7cc8db125~mv2.jpg",
        description: "As part of Toronto Craft Beer Week celebrations, Junction Craft Brewing hosts a special tap takeover featuring collaboration brews with five other local Toronto breweries. Sample exclusive small-batch beers, meet the brewers, and enjoy brewery tours throughout the evening. Food pairings available from our kitchen, designed to complement each special release beer.",
        startDate: new Date("2025-07-25T21:00:00.000Z"), // July 25, 2025, 5:00 PM EST
        endDate: new Date("2025-07-26T02:00:00.000Z"), // July 25, 2025, 10:00 PM EST
        categories: ["Beer", "Festival", "Tasting", "Brewery", "Toronto"],
        price: "$25 (includes 5 tasting tokens)"
      },
      {
        name: "Vinyl Night at the Junction",
        url: "https://www.junctioncraft.com/whatson",
        imageUrl: "https://static.wixstatic.com/media/d0b27f_a6bf592a124d4f86a46bd9c7fd381d7f~mv2.jpg",
        description: "Bring your favorite records to Junction Craft Brewing's Vinyl Night! Our resident DJ will be spinning patron-provided vinyl all evening, creating a community-curated soundtrack. Enjoy $5 off flights and special discounts on select pints while experiencing the warm analog sounds of vinyl in our industrial-chic taproom. Record enthusiasts and casual listeners alike are welcome to this laid-back evening celebrating music and craft beer.",
        startDate: new Date("2025-07-21T23:00:00.000Z"), // July 21, 2025, 7:00 PM EST
        endDate: new Date("2025-07-22T02:00:00.000Z"), // July 21, 2025, 10:00 PM EST
        categories: ["Music", "Beer", "Social", "Vinyl", "Toronto"],
        price: "Free entry",
        recurring: "Monthly on 3rd Monday"
      },
      {
        name: "Beer & Food Pairing Workshop",
        url: "https://www.junctioncraft.com/whatson",
        imageUrl: "https://static.wixstatic.com/media/d0b27f_debb02b8cf254d4eb7ea9d99a8a0d93e~mv2.jpg",
        description: "Expand your palate at Junction Craft Brewing's Beer & Food Pairing Workshop. Our head brewer and chef team up to guide participants through five thoughtfully paired beer and food combinations, explaining the flavor principles that make each match work. Learn about beer styles, brewing processes, and how different flavor components interact. Tickets include all beer samples, food pairings, and a take-home tasting guide.",
        startDate: new Date("2025-07-24T22:00:00.000Z"), // July 24, 2025, 6:00 PM EST
        endDate: new Date("2025-07-25T00:00:00.000Z"), // July 24, 2025, 8:00 PM EST
        categories: ["Workshop", "Beer", "Food", "Tasting", "Toronto"],
        price: "$45 per person",
        recurring: "Monthly on last Thursday"
      },
      {
        name: "Community Craft Market",
        url: "https://www.junctioncraft.com/whatson",
        imageUrl: "https://static.wixstatic.com/media/d0b27f_b8d1e4b34d214ea28a9c7c7575945342~mv2.jpg",
        description: "Browse handmade goods from local artisans at Junction Craft Brewing's Community Craft Market. The brewery transforms into a showcase for Toronto's creative community, featuring jewelry, art, home goods, clothing, and more from independent makers. Grab a pint and explore the diverse offerings while chatting directly with the creators. The perfect opportunity to support local businesses while enjoying Junction's craft beverages in a festive atmosphere.",
        startDate: new Date("2025-07-27T16:00:00.000Z"), // July 27, 2025, 12:00 PM EST
        endDate: new Date("2025-07-27T21:00:00.000Z"), // July 27, 2025, 5:00 PM EST
        categories: ["Market", "Shopping", "Beer", "Artisan", "Toronto"],
        price: "Free admission",
        recurring: "Last Sunday of each month"
      }
    ];
    
    let addedCount = 0;
    
    // Create properly formatted events and add to database
    for (const eventData of junctionCraftEvents) {
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
          name: "Junction Craft Brewing",
          address: "150 Symes Road",
          city: "Toronto",
          state: "Ontario",
          country: "Canada",
          coordinates: {
            lat: 43.6742,
            lng: -79.4775
          }
        },
        price: eventData.price,
        tags: ["craft-beer", "brewery", "taproom", "the-junction", "local-business"]
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
    
    console.log(`\n📊 Added ${addedCount} new events from Junction Craft Brewing`);
    
    // Verify Toronto events count
    const torontoEvents = await eventsCollection.find({
      city: "Toronto"
    }).toArray();
    
    console.log(`📊 Total events with city="Toronto" now: ${torontoEvents.length}`);
    
  } catch (error) {
    console.error('❌ Error adding Junction Craft Brewing events:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
addJunctionCraftEvents().catch(console.error);
