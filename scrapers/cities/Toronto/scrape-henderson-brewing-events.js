/**
 * Script to add Henderson Brewing events to the database
 * Based on events from https://shophendersonbrewing.com/pages/events-calendar
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

async function addHendersonEvents() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB cloud database');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('🍺 Adding Henderson Brewing events to database...');
    
    // List of Henderson Brewing events
    const hendersonEvents = [
      {
        name: "FEASTIE Sip & Snack Festival",
        url: "https://www.eventbrite.com/e/feastie-sip-snack-festival-tickets-1357325249359",
        imageUrl: "https://cdn.shopify.com/s/files/1/0371/5025/files/feastie-2025.jpg",
        description: "A unique food and drink social bringing together the perfect harmony of elevated craft cocktails, beers & natural wines, diverse snack food offerings from Local-, BIPOC-, & Female-owned small businesses, live music, games, & entertainment. Plus, a specially curated dog area with local dog vendors makes this a pet-friendly event for the whole family.",
        startDate: new Date("2025-07-19T17:00:00.000Z"), // July 19, 2025, 1pm EDT
        endDate: new Date("2025-07-20T01:00:00.000Z"), // July 19, 2025, 9pm EDT
        categories: ["Festival", "Food", "Beer", "Music", "Toronto"],
        price: "$25-35"
      },
      {
        name: "Rush Day 2025",
        url: "https://shophendersonbrewing.com/products/rush-day-2025",
        imageUrl: "https://cdn.shopify.com/s/files/1/0371/5025/files/rush-day-2025.jpg",
        description: "Henderson Brewing is thrilled to welcome the worldwide Rush fan community to Toronto, Canada for our 3rd Annual Rush-inspired day of music, beer, and celebration! This day-long celebration features Rush tribute bands, limited-edition Rush-themed beer releases, memorabilia vendors, and appearances by special guests connected to the legendary Canadian rock band.",
        startDate: new Date("2025-08-23T16:00:00.000Z"), // Aug 23, 2025, 12pm EDT
        endDate: new Date("2025-08-24T00:00:00.000Z"), // Aug 23, 2025, 8pm EDT
        categories: ["Music", "Beer", "Festival", "Rock", "Toronto"],
        price: "$45"
      },
      {
        name: "Picklefest™ Food & Drink Festival - Saturday",
        url: "https://picklefestcanada.com/products/picklefest-food-drink-festival-2025-toronto",
        imageUrl: "https://cdn.shopify.com/s/files/1/0371/5025/files/picklefest-2025.jpg",
        description: "Featuring over 50 vendors offering all things pickled and fermented with fully licensed beverage selections! This all-ages event promises pickle-infused fun rain or shine. Sample and purchase unique pickled products, enjoy pickle-themed foods and drinks, participate in pickling demonstrations, and more. Kids under 12 attend for FREE!",
        startDate: new Date("2025-09-20T15:00:00.000Z"), // Sept 20, 2025, 11am EDT
        endDate: new Date("2025-09-20T22:00:00.000Z"), // Sept 20, 2025, 6pm EDT
        categories: ["Food", "Festival", "Beer", "Family", "Toronto"],
        price: "$15-20"
      },
      {
        name: "Picklefest™ Food & Drink Festival - Sunday",
        url: "https://picklefestcanada.com/products/picklefest-food-drink-festival-2025-toronto",
        imageUrl: "https://cdn.shopify.com/s/files/1/0371/5025/files/picklefest-2025.jpg",
        description: "Day two of Toronto's pickle paradise! Featuring over 50 vendors offering all things pickled and fermented with fully licensed beverage selections! This all-ages event promises pickle-infused fun rain or shine. Sample and purchase unique pickled products, enjoy pickle-themed foods and drinks, participate in pickling demonstrations, and more. Kids under 12 attend for FREE!",
        startDate: new Date("2025-09-21T16:00:00.000Z"), // Sept 21, 2025, 12pm EDT
        endDate: new Date("2025-09-21T21:00:00.000Z"), // Sept 21, 2025, 5pm EDT
        categories: ["Food", "Festival", "Beer", "Family", "Toronto"],
        price: "$15-20"
      },
      {
        name: "Euchre Night @ Henderson Brewing",
        url: "https://www.eventbrite.ca/e/tuesday-night-euchre-at-henderson-tickets-649173163407",
        imageUrl: "https://cdn.shopify.com/s/files/1/0371/5025/files/euchre-night.jpg",
        description: "Euchre and beer… always a winning pair! Join fellow card enthusiasts for a fun evening of euchre in Henderson's taproom. Registration is required to join the Euchre group. Paid entry includes one beer token. Perfect for both experienced players and those looking to learn this classic Canadian card game.",
        startDate: new Date("2025-07-15T23:00:00.000Z"), // July 15, 2025, 7pm EDT
        endDate: new Date("2025-07-16T01:00:00.000Z"), // July 15, 2025, 9pm EDT
        categories: ["Games", "Beer", "Social", "Cards", "Toronto"],
        price: "$10 (includes one beer)",
        recurring: "Every Other Tuesday"
      },
      {
        name: "Island Oysters Pop-Up - Shuck Fifty Sundays",
        url: "https://shophendersonbrewing.com/pages/events-calendar",
        imageUrl: "https://cdn.shopify.com/s/files/1/0371/5025/files/island-oysters.jpg",
        description: "Join us for \"Shuck Fifty Sundays\" presented by Island Oysters and Henderson Brewing Co. Enjoy a selection of East Coast Oysters for $1.50 each, available from 1pm until sold out every Sunday. Get briny with us and crush a Sunday afternoon with $1.50 oysters, frosty brews, board games, pizza and great vibes!",
        startDate: new Date("2025-07-20T17:00:00.000Z"), // July 20, 2025, 1pm EDT
        endDate: new Date("2025-07-20T22:00:00.000Z"), // July 20, 2025, 6pm EDT (or until sold out)
        categories: ["Food", "Beer", "Social", "Seafood", "Toronto"],
        price: "$1.50 per oyster",
        recurring: "Every Sunday"
      }
    ];
    
    let addedCount = 0;
    
    // Create properly formatted events and add to database
    for (const eventData of hendersonEvents) {
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
          name: "Henderson Brewing Co.",
          address: "128A Sterling Rd.",
          city: "Toronto",
          state: "Ontario",
          country: "Canada",
          coordinates: {
            lat: 43.6543,
            lng: -79.4422
          }
        },
        price: eventData.price,
        tags: ["craft-beer", "brewery", "local-business", "sterling-road"]
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
    
    console.log(`\n📊 Added ${addedCount} new events from Henderson Brewing`);
    
    // Verify Toronto events count
    const torontoEvents = await eventsCollection.find({
      city: "Toronto"
    }).toArray();
    
    console.log(`📊 Total events with city="Toronto" now: ${torontoEvents.length}`);
    
  } catch (error) {
    console.error('❌ Error adding Henderson Brewing events:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
addHendersonEvents().catch(console.error);
