/**
 * Script to add Harbourfront Centre events to the database
 * Based on events from https://harbourfrontcentre.com/whats-on/
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

async function addHarbourfrontEvents() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB cloud database');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('🌊 Adding Harbourfront Centre events to database...');
    
    // List of Harbourfront Centre events
    const harbourfrontEvents = [
      {
        name: "Dancing on the Square - Summer Series",
        url: "https://harbourfrontcentre.com/series/dancing-on-the-square-2025/",
        imageUrl: "https://harbourfrontcentre.com/wp-content/uploads/2024/06/dancing-on-the-square-1600x900.jpg",
        description: "Every Wednesday in July and August, learn new dance moves and show off your style to a live band by the water's edge. Different dance styles are featured each week, from bachata to balfolk, with professional instructors to guide both beginners and experienced dancers. This free outdoor event has become a summer tradition at Toronto's waterfront.",
        startDate: new Date("2025-07-16T23:00:00.000Z"), // July 16, 2025, 7:00 PM EST
        endDate: new Date("2025-08-27T23:00:00.000Z"), // Aug 27, 2025
        categories: ["Dance", "Music", "Outdoor", "Free", "Toronto"],
        price: "Free (registration required)",
        recurring: "Weekly on Wednesdays"
      },
      {
        name: "Bachata with Soul2Sole",
        url: "https://harbourfrontcentre.com/event/bachata-with-soul2sole-dots-2025/",
        imageUrl: "https://harbourfrontcentre.com/wp-content/uploads/2024/06/bachata-1600x900.jpg",
        description: "Spice up your night with the rhythms of bachata! Join professional dancers from Soul2Sole for an evening of learning and dancing this sensual Latin dance style originated from the Dominican Republic. Perfect for beginners and experienced dancers alike, this event features live music and instruction by the beautiful waterfront setting.",
        startDate: new Date("2025-07-16T23:00:00.000Z"), // July 16, 2025, 7:00 PM EST
        endDate: new Date("2025-07-17T01:00:00.000Z"), // July 16, 9:00 PM EST
        categories: ["Dance", "Latin", "Instruction", "Free", "Toronto"],
        price: "Free (registration required)"
      },
      {
        name: "Unity Fest",
        url: "https://harbourfrontcentre.com/series/unityfest-2025/",
        imageUrl: "https://harbourfrontcentre.com/wp-content/uploads/2024/06/unityfest-1600x900.jpg",
        description: "Unity Fest celebrates hip-hop culture with dance battles, live performances, workshops, and activities for all ages. This day-long festival brings together Toronto's vibrant urban arts community for competitions, showcases, and interactive experiences. Featuring renowned DJs, MCs, breakdancers, and graffiti artists, Unity Fest is a cornerstone summer event at Harbourfront Centre.",
        startDate: new Date("2025-07-19T16:00:00.000Z"), // July 19, 2025, all day event
        endDate: new Date("2025-07-20T02:00:00.000Z"), // July 19, late evening
        categories: ["Festival", "Hip-Hop", "Dance", "Music", "Toronto"],
        price: "Various (some events free)"
      },
      {
        name: "Harbourfront Farmers Market",
        url: "https://harbourfrontcentre.com/event/harbourfront-farmers-market/",
        imageUrl: "https://harbourfrontcentre.com/wp-content/uploads/2024/06/farmers-market-1600x900.jpg",
        description: "Every Saturday, enjoy the best in seasonal produce, meats and artisanal products from Ontario's farmers and small-batch producers. The Harbourfront Farmers Market offers visitors a chance to shop directly from local vendors in a picturesque waterfront setting. With a focus on sustainability and community, the market features organic options, ready-to-eat foods, and handcrafted goods.",
        startDate: new Date("2025-07-19T13:00:00.000Z"), // July 19, 2025, 9:00 AM EST
        endDate: new Date("2025-07-19T18:00:00.000Z"), // July 19, 2:00 PM EST
        categories: ["Market", "Food", "Shopping", "Free", "Toronto"],
        price: "Free admission",
        recurring: "Weekly on Saturdays"
      },
      {
        name: "Underground Night Market",
        url: "https://harbourfrontcentre.com/event/undrgrndnghtmrkt/",
        imageUrl: "https://harbourfrontcentre.com/wp-content/uploads/2024/06/night-market-1600x900.jpg",
        description: "Every Saturday night, join for late-night market vibes and browse indie food and drink vendors — all at $10 and under. The Underground Night Market transforms Harbourfront Centre into a vibrant evening bazaar featuring local entrepreneurs, artists, and food innovators. With DJs spinning tunes and the lakefront as a backdrop, it's the perfect way to experience Toronto's diverse culinary scene.",
        startDate: new Date("2025-07-19T21:00:00.000Z"), // July 19, 2025, 5:00 PM EST
        endDate: new Date("2025-07-20T03:00:00.000Z"), // July 19, 11:00 PM EST
        categories: ["Market", "Food", "Nightlife", "Free", "Toronto"],
        price: "Free admission (food/drinks for purchase)",
        recurring: "Weekly on Saturdays"
      },
      {
        name: "Free Flicks - Summer Outdoor Film Series",
        url: "https://harbourfrontcentre.com/series/free-flicks-2025/",
        imageUrl: "https://harbourfrontcentre.com/wp-content/uploads/2024/06/free-flicks-1600x900.jpg",
        description: "Join us for free outdoor film screenings on Tuesdays all summer by the lake. Free Flicks brings the magic of cinema to Toronto's waterfront with a carefully curated selection of films for all ages. Bring a blanket or chair and enjoy movies under the stars with the stunning backdrop of Lake Ontario and the city skyline.",
        startDate: new Date("2025-07-22T00:30:00.000Z"), // July 22, 2025, 8:30 PM EST
        endDate: new Date("2025-08-26T00:30:00.000Z"), // Aug 26, 2025, 8:30 PM EST
        categories: ["Film", "Outdoor", "Free", "Family", "Toronto"],
        price: "Free (registration required)",
        recurring: "Weekly on Tuesdays"
      },
      {
        name: "Big Hero 6 - Free Flicks Screening",
        url: "https://harbourfrontcentre.com/event/big-hero-6-free-flicks-2025/",
        imageUrl: "https://harbourfrontcentre.com/wp-content/uploads/2024/06/big-hero-6-1600x900.jpg",
        description: "A band of high-tech heroes' adventure through the futuristic city of San Fransokyo. This Disney animated film follows Hiro Hamada, a robotics prodigy, and his healthcare companion robot Baymax as they form a superhero team. Bring the whole family for this heartwarming outdoor screening by the lake.",
        startDate: new Date("2025-07-22T00:30:00.000Z"), // July 22, 2025, 8:30 PM EST
        endDate: new Date("2025-07-22T02:30:00.000Z"), // July 22, 10:30 PM EST
        categories: ["Film", "Animation", "Outdoor", "Free", "Toronto"],
        price: "Free (registration required)"
      },
      {
        name: "Summer Music in the Garden",
        url: "https://harbourfrontcentre.com/series/summer-music-in-the-garden-2025/",
        imageUrl: "https://harbourfrontcentre.com/wp-content/uploads/2024/06/summer-music-garden-1600x900.jpg",
        description: "Enjoy an intimate live music experience by the waterfront in Toronto's Music Garden. This concert series features diverse musical traditions performed by accomplished musicians in the unique setting of a garden designed by renowned cellist Yo-Yo Ma and landscape designer Julie Moir Messervy, inspired by Bach's Suite No. 1 in G Major for unaccompanied cello.",
        startDate: new Date("2025-07-24T23:00:00.000Z"), // July 24, 2025, 7:00 PM EST
        endDate: new Date("2025-08-28T23:00:00.000Z"), // Aug 28, 2025, 7:00 PM EST
        categories: ["Music", "Concert", "Garden", "Free", "Toronto"],
        price: "Free",
        recurring: "Weekly on Thursdays"
      }
    ];
    
    let addedCount = 0;
    
    // Create properly formatted events and add to database
    for (const eventData of harbourfrontEvents) {
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
          name: "Harbourfront Centre",
          address: "235 Queens Quay West",
          city: "Toronto",
          state: "Ontario",
          country: "Canada",
          coordinates: {
            lat: 43.6389,
            lng: -79.3808
          }
        },
        price: eventData.price,
        tags: ["waterfront", "arts", "culture", "family-friendly", "outdoor"]
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
    
    console.log(`\n📊 Added ${addedCount} new events from Harbourfront Centre`);
    
    // Verify Toronto events count
    const torontoEvents = await eventsCollection.find({
      city: "Toronto"
    }).toArray();
    
    console.log(`📊 Total events with city="Toronto" now: ${torontoEvents.length}`);
    
  } catch (error) {
    console.error('❌ Error adding Harbourfront Centre events:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
addHarbourfrontEvents().catch(console.error);
