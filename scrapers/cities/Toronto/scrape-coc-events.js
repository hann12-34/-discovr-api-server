/**
 * Script to add Canadian Opera Company 2025-26 Season events to the database
 * Based on events from https://www.coc.ca/tickets/2526-season
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

async function addCanadianOperaEvents() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB cloud database');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('🎭 Adding Canadian Opera Company 2025-26 Season events to database...');
    
    // List of Canadian Opera Company events from the 2025-26 Season
    const cocEvents = [
      {
        name: "Roméo et Juliette - Canadian Opera Company",
        url: "https://www.coc.ca/tickets/2526-season",
        imageUrl: "https://www.coc.ca/Assets/COC+Assets/Images/2526/romeo-et-juliette/romeo-et-juliette-1300x860.jpg",
        description: "Charles Gounod's passionate adaptation of Shakespeare's timeless tragedy. Experience the heartbreaking tale of star-crossed lovers set to soaring French romantic music. This new production brings fresh perspective to one of opera's most beloved romances.",
        startDate: new Date("2025-09-20T18:30:00.000Z"), // Sept 20, 2025
        endDate: new Date("2025-10-05T22:00:00.000Z"), // Oct 5, 2025
        categories: ["Opera", "Performance", "Classical", "Theatre", "Toronto"],
        price: "$50-250"
      },
      {
        name: "Orfeo ed Euridice - Canadian Opera Company",
        url: "https://www.coc.ca/tickets/2526-season/orfeo-ed-euridice",
        imageUrl: "https://www.coc.ca/Assets/COC+Assets/Images/2526/orfeo/orfeo-1300x860.jpg",
        description: "Christoph Willibald Gluck's mythological masterpiece about love, loss, and the journey to the underworld. This groundbreaking work follows Orfeo as he descends into Hades to rescue his beloved Euridice, guided only by the power of his music.",
        startDate: new Date("2025-10-09T18:30:00.000Z"), // Oct 9, 2025
        endDate: new Date("2025-10-25T22:00:00.000Z"), // Oct 25, 2025
        categories: ["Opera", "Performance", "Classical", "Theatre", "Toronto"],
        price: "$50-250"
      },
      {
        name: "Centre Stage: Ensemble Studio Competition & Gala - Canadian Opera Company",
        url: "https://www.coc.ca/tickets/2526-season/centre-stage",
        imageUrl: "https://www.coc.ca/Assets/COC+Assets/Images/2526/centre-stage/centre-stage-1300x860.jpg",
        description: "Experience the future stars of opera at the COC's annual Ensemble Studio Competition & Gala. Canada's finest young opera talents compete for cash prizes and positions in the prestigious COC Ensemble Studio training program, performing their signature arias with full orchestra.",
        startDate: new Date("2025-10-23T18:00:00.000Z"), // Oct 23, 2025
        endDate: new Date("2025-10-23T22:00:00.000Z"), // Oct 23, 2025
        categories: ["Opera", "Gala", "Competition", "Performance", "Toronto"],
        price: "$75-200"
      },
      {
        name: "Rigoletto - Canadian Opera Company",
        url: "https://www.coc.ca/tickets/2526-season/rigoletto",
        imageUrl: "https://www.coc.ca/Assets/COC+Assets/Images/2526/rigoletto/rigoletto-1300x860.jpg",
        description: "Giuseppe Verdi's masterpiece of vengeance, sacrifice, and tragedy. Follow the story of the cursed court jester Rigoletto as he attempts to protect his beloved daughter from the Duke of Mantua's advances, only to become entangled in a web of corruption and revenge.",
        startDate: new Date("2026-01-24T18:30:00.000Z"), // Jan 24, 2026
        endDate: new Date("2026-02-14T22:00:00.000Z"), // Feb 14, 2026
        categories: ["Opera", "Performance", "Classical", "Theatre", "Toronto"],
        price: "$50-250"
      },
      {
        name: "The Barber of Seville - Canadian Opera Company",
        url: "https://www.coc.ca/tickets/2526-season/the-barber-of-seville",
        imageUrl: "https://www.coc.ca/Assets/COC+Assets/Images/2526/barber/barber-1300x860.jpg",
        description: "Gioachino Rossini's sparkling comic masterpiece. This witty production follows the clever barber Figaro as he helps the love-struck Count Almaviva win the heart of the beautiful Rosina, outwitting her guardian Dr. Bartolo in a series of hilarious disguises and schemes.",
        startDate: new Date("2026-02-05T18:30:00.000Z"), // Feb 5, 2026
        endDate: new Date("2026-02-21T22:00:00.000Z"), // Feb 21, 2026
        categories: ["Opera", "Comedy", "Performance", "Classical", "Toronto"],
        price: "$50-250"
      },
      {
        name: "Bluebeard's Castle/Erwartung - Canadian Opera Company",
        url: "https://www.coc.ca/tickets/2526-season/bluebeards-castle-erwartung",
        imageUrl: "https://www.coc.ca/Assets/COC+Assets/Images/2526/bluebeard/bluebeard-1300x860.jpg",
        description: "Experience Robert Lepage's groundbreaking double bill that revolutionized Canadian opera. Bartók's haunting psychological thriller Bluebeard's Castle is paired with Schoenberg's expressionist monodrama Erwartung in a visually stunning production that explores the depths of the human psyche.",
        startDate: new Date("2026-04-25T18:30:00.000Z"), // April 25, 2026
        endDate: new Date("2026-05-16T22:00:00.000Z"), // May 16, 2026
        categories: ["Opera", "Performance", "Modern", "Theatre", "Toronto"],
        price: "$50-250"
      },
      {
        name: "Werther - Canadian Opera Company",
        url: "https://www.coc.ca/tickets/2526-season/werther",
        imageUrl: "https://www.coc.ca/Assets/COC+Assets/Images/2526/werther/werther-1300x860.jpg",
        description: "Jules Massenet's deeply romantic tragedy based on Goethe's novel. Follow the passionate poet Werther as he falls desperately in love with Charlotte, who is promised to another man. This heart-wrenching exploration of unrequited love features some of opera's most beautiful and emotionally charged music.",
        startDate: new Date("2026-05-07T18:30:00.000Z"), // May 7, 2026
        endDate: new Date("2026-05-23T22:00:00.000Z"), // May 23, 2026
        categories: ["Opera", "Performance", "Romance", "Theatre", "Toronto"],
        price: "$50-250"
      }
    ];
    
    let addedCount = 0;
    
    // Create properly formatted events and add to database
    for (const eventData of cocEvents) {
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
          name: "Four Seasons Centre for the Performing Arts",
          address: "145 Queen Street West",
          city: "Toronto",
          state: "Ontario",
          country: "Canada",
          coordinates: {
            lat: 43.6503,
            lng: -79.3862
          }
        },
        price: eventData.price,
        tags: ["opera", "classical", "performing-arts", "culture", "music"]
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
    
    console.log(`\n📊 Added ${addedCount} new events from Canadian Opera Company`);
    
    // Verify Toronto events count
    const torontoEvents = await eventsCollection.find({
      city: "Toronto"
    }).toArray();
    
    console.log(`📊 Total events with city="Toronto" now: ${torontoEvents.length}`);
    
  } catch (error) {
    console.error('❌ Error adding Canadian Opera Company events:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
addCanadianOperaEvents().catch(console.error);
