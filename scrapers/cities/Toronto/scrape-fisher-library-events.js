/**
 * Script to add Thomas Fisher Rare Book Library events to the database
 * Based on events from https://fisher.library.utoronto.ca/friends-fisher-events
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

async function addFisherLibraryEvents() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB cloud database');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('📚 Adding Fisher Library events to database...');
    
    // List of Fisher Library events from the website
    const fisherEvents = [
      {
        name: "George Kiddell Memorial Lecture: What's Cooking in Guyana? A Conversation about Food Cultures",
        url: "https://fisher.library.utoronto.ca/fisher-events/george-kiddell-memorial-lecture-whats-cooking-guyana-conversation-about-food-cultures",
        imageUrl: "https://fisher.library.utoronto.ca/sites/fisher.library.utoronto.ca/files/fisher-library.jpg",
        description: "This year's Kiddell Lecture on the History of the Book is a conversation about memory, storytelling, and identity around cookbooks and food cultures in Guyana. Join us for an enlightening discussion on how culinary traditions shape cultural heritage and community connections across generations.",
        startDate: new Date("2025-09-18T18:30:00.000Z"), // Sept 18th evening
        endDate: new Date("2025-09-18T20:00:00.000Z"),
        categories: ["Lecture", "Culture", "Food", "History", "Toronto"],
        price: "Free (Registration required)"
      },
      {
        name: "Johanna and Leon Katz Memorial Lecture: Maurice Vellekoop - \"I'm So Glad We Had This Time\"",
        url: "https://fisher.library.utoronto.ca/fisher-events/katz-memorial-lecture-maurice-vellekoop",
        imageUrl: "https://fisher.library.utoronto.ca/sites/fisher.library.utoronto.ca/files/vellekoop-lecture.jpg",
        description: "Illustrator and cartoonist Maurice Vellekoop will discuss how his award-winning graphic memoir, I'm So Glad We Had This Time Together, is in part a love letter to the author's hometown of Toronto. Explore the visual storytelling that captures Toronto's unique character and the artist's personal journey through its streets and communities.",
        startDate: new Date("2025-10-16T18:30:00.000Z"), // Oct 16th evening
        endDate: new Date("2025-10-16T20:00:00.000Z"),
        categories: ["Lecture", "Art", "Literature", "Toronto", "Graphic Memoir"],
        price: "Free (Registration required)"
      },
      {
        name: "John Seltzer and Mark Seltzer Memorial Lecture: Mark Andrews on \"Engineering a Book Collection\"",
        url: "https://fisher.library.utoronto.ca/fisher-events/john-seltzer-and-mark-seltzer-memorial-lecture-mark-andrews-engineering-book",
        imageUrl: "https://fisher.library.utoronto.ca/sites/fisher.library.utoronto.ca/files/seltzer-lecture.jpg",
        description: "Describing a collection of 7,000 books related to engineering is a daunting task. Rather than giving an account of the entire collection, in this lecture Mark Andrews will tell us the story of four of these books and how they came to be in the collection. Join us for this fascinating exploration of engineering literature and book collecting.",
        startDate: new Date("2025-11-20T18:30:00.000Z"), // Nov 20th evening
        endDate: new Date("2025-11-20T20:00:00.000Z"),
        categories: ["Lecture", "Books", "Engineering", "Collection", "Toronto"],
        price: "Free (Registration required)"
      },
      {
        name: "Fisher Library Exhibition Tour: Rare Books of the Scientific Revolution",
        url: "https://fisher.library.utoronto.ca/friends-fisher-events",
        imageUrl: "https://fisher.library.utoronto.ca/sites/fisher.library.utoronto.ca/files/fisher-exhibition.jpg",
        description: "Join a guided tour of the Thomas Fisher Rare Book Library's special exhibition featuring extraordinary works from the Scientific Revolution. See first editions of works by Galileo, Newton, and other pioneers of modern science. The tour includes access to rarely displayed items and expert commentary on their historical significance.",
        startDate: new Date("2025-08-12T14:00:00.000Z"), // August 12th afternoon
        endDate: new Date("2025-08-12T15:30:00.000Z"),
        categories: ["Tour", "Exhibition", "Science", "History", "Toronto"],
        price: "Free (Registration required)"
      },
      {
        name: "Friends of Fisher Annual Book Sale",
        url: "https://fisher.library.utoronto.ca/friends-fisher-events",
        imageUrl: "https://fisher.library.utoronto.ca/sites/fisher.library.utoronto.ca/files/book-sale.jpg",
        description: "The annual Friends of Fisher Book Sale returns with a vast selection of donated and duplicate books from the library's collection. Find unique treasures spanning literature, history, science, art, and more at prices starting at just a few dollars. All proceeds support the Thomas Fisher Rare Book Library's acquisition and preservation efforts.",
        startDate: new Date("2025-10-25T10:00:00.000Z"), // Oct 25th morning
        endDate: new Date("2025-10-27T17:00:00.000Z"), // Oct 27th afternoon
        categories: ["Book Sale", "Fundraiser", "Books", "Community", "Toronto"],
        price: "Free admission"
      }
    ];
    
    let addedCount = 0;
    
    // Create properly formatted events and add to database
    for (const eventData of fisherEvents) {
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
          name: "Thomas Fisher Rare Book Library",
          address: "120 St. George Street",
          city: "Toronto",
          state: "Ontario",
          country: "Canada",
          coordinates: {
            lat: 43.6646,
            lng: -79.3995
          }
        },
        price: eventData.price,
        tags: ["university", "library", "academic", "literature", "books"]
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
    
    console.log(`\n📊 Added ${addedCount} new events from Fisher Library`);
    
    // Verify Toronto events count
    const torontoEvents = await eventsCollection.find({
      city: "Toronto"
    }).toArray();
    
    console.log(`📊 Total events with city="Toronto" now: ${torontoEvents.length}`);
    
  } catch (error) {
    console.error('❌ Error adding Fisher Library events:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
addFisherLibraryEvents().catch(console.error);
