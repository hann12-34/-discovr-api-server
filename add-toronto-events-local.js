/**
 * Script to add Toronto events to the local MongoDB database
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

// Local MongoDB connection URI
const mongoURI = 'mongodb://localhost:27017/discovr';

// Function to add Toronto events
async function addTorontoEvents() {
  const client = new MongoClient(mongoURI);
  
  try {
    await client.connect();
    console.log('✅ Connected to local MongoDB');
    
    const db = client.db('discovr');
    const eventsCollection = db.collection('events');
    
    // Check for and delete any existing Toronto events
    console.log('🔍 Checking for existing Toronto events...');
    const existingTorontoEvents = await eventsCollection.find({
      $or: [
        { 'venue.city': 'Toronto' },
        { city: 'Toronto' }
      ]
    }).toArray();
    
    console.log(`Found ${existingTorontoEvents.length} existing Toronto events`);
    
    if (existingTorontoEvents.length > 0) {
      const deleteResult = await eventsCollection.deleteMany({
        $or: [
          { 'venue.city': 'Toronto' },
          { city: 'Toronto' }
        ]
      });
      console.log(`🗑️ Deleted ${deleteResult.deletedCount} existing Toronto events`);
    }
    
    // Get current timestamp for unique IDs
    const timestamp = Date.now();
    
    // Create Toronto events with the correct structure to match existing events
    const torontoEvents = [
      {
        _id: new ObjectId(),
        id: `tor-sym-${timestamp}-1`,
        title: "Toronto Symphony Orchestra - Mozart's Jupiter Symphony",
        description: "Experience the brilliance of Mozart's final symphony, known as 'Jupiter,' performed by the renowned Toronto Symphony Orchestra.",
        image: "https://www.tso.ca/sites/default/files/styles/hero_banner/public/2022-05/TSO_hero_1920x1080_beethoven_9th.jpg",
        startDate: new Date(new Date().setDate(new Date().getDate() + 7)),
        endDate: new Date(new Date().setDate(new Date().getDate() + 7)),
        season: 'Summer',
        location: 'Roy Thomson Hall, Toronto',
        venue: {
          name: 'Roy Thomson Hall',
          address: '60 Simcoe St',
          city: 'Toronto',
          state: 'ON',
          country: 'Canada'
        },
        category: 'Classical',
        priceRange: 'Medium',
        sourceURL: "https://www.roythomsonhall.com/calendar",
        officialWebsite: "https://www.tso.ca",
        dataSources: ['toronto-events'],
        lastUpdated: new Date()
      },
      {
        _id: new ObjectId(),
        id: `tor-jazz-${timestamp}-2`,
        title: "Toronto Jazz Festival - Main Stage",
        description: "The TD Toronto Jazz Festival returns with a stellar lineup of local and international jazz artists.",
        image: "https://www.toronto.ca/wp-content/uploads/2018/01/9664-toronto-jazz-festival.jpg",
        startDate: new Date(new Date().setDate(new Date().getDate() + 14)),
        endDate: new Date(new Date().setDate(new Date().getDate() + 21)),
        season: 'Summer',
        location: 'Nathan Phillips Square, Toronto',
        venue: {
          name: 'Nathan Phillips Square',
          address: '100 Queen St W',
          city: 'Toronto',
          state: 'ON',
          country: 'Canada'
        },
        category: 'Music',
        priceRange: 'Medium',
        sourceURL: "https://torontojazz.com",
        officialWebsite: "https://torontojazz.com",
        dataSources: ['toronto-events'],
        lastUpdated: new Date()
      },
      {
        _id: new ObjectId(),
        id: `tor-art-${timestamp}-3`,
        title: "Immersive Van Gogh Exhibition",
        description: "Step into the extraordinary world of Vincent van Gogh in this immersive art experience.",
        image: "https://images.squarespace-cdn.com/content/v1/606904a1262e31677e03df9f/1617555916473-DTJ94DKDGZDMSPR8GEBJ/van-gogh-room-1.jpg",
        startDate: new Date(new Date().setDate(new Date().getDate() + 3)),
        endDate: new Date(new Date().setDate(new Date().getDate() + 90)),
        season: 'Summer',
        location: 'Lighthouse Immersive, Toronto',
        venue: {
          name: 'Lighthouse Immersive',
          address: '1 Yonge Street',
          city: 'Toronto',
          state: 'ON',
          country: 'Canada'
        },
        category: 'Art',
        priceRange: 'Medium',
        sourceURL: "https://www.lighthouseimmersive.com",
        officialWebsite: "https://www.lighthouseimmersive.com",
        dataSources: ['toronto-events'],
        lastUpdated: new Date()
      },
      {
        _id: new ObjectId(),
        id: `tor-rom-${timestamp}-4`,
        title: "Royal Ontario Museum - Egyptian Mummies Exhibition",
        description: "Discover the fascinating world of ancient Egyptian burial practices and mummification.",
        image: "https://www.rom.on.ca/sites/default/files/styles/16_9_banner/public/Egyptian-Mummies.jpg",
        startDate: new Date(new Date().setDate(new Date().getDate())),
        endDate: new Date(new Date().setDate(new Date().getDate() + 120)),
        season: 'Summer',
        location: 'Royal Ontario Museum, Toronto',
        venue: {
          name: 'Royal Ontario Museum',
          address: '100 Queens Park',
          city: 'Toronto',
          state: 'ON',
          country: 'Canada'
        },
        category: 'Museum',
        priceRange: 'Low',
        sourceURL: "https://www.rom.on.ca",
        officialWebsite: "https://www.rom.on.ca",
        dataSources: ['toronto-events'],
        lastUpdated: new Date()
      },
      {
        _id: new ObjectId(),
        id: `tor-leaf-${timestamp}-5`,
        title: "Toronto Maple Leafs vs Montreal Canadiens",
        description: "Witness one of hockey's greatest rivalries as the Toronto Maple Leafs face off against the Montreal Canadiens.",
        image: "https://cms.nhl.bamgrid.com/images/photos/281721134/1284x722/cut.jpg",
        startDate: new Date(new Date().setDate(new Date().getDate() + 10)),
        endDate: new Date(new Date().setDate(new Date().getDate() + 10)),
        season: 'Summer',
        location: 'Scotiabank Arena, Toronto',
        venue: {
          name: 'Scotiabank Arena',
          address: '40 Bay St',
          city: 'Toronto',
          state: 'ON',
          country: 'Canada'
        },
        category: 'Sports',
        priceRange: 'High',
        sourceURL: "https://www.scotiabankarena.com",
        officialWebsite: "https://www.nhl.com/mapleleafs",
        dataSources: ['toronto-events'],
        lastUpdated: new Date()
      }
    ];
    
    // Insert events one by one
    console.log('Inserting Toronto events one by one...');
    let insertedCount = 0;
    
    for (const event of torontoEvents) {
      try {
        const result = await eventsCollection.insertOne(event);
        if (result.acknowledged) {
          console.log(`✅ Added event: ${event.title}`);
          insertedCount++;
        }
      } catch (error) {
        console.error(`❌ Error adding event ${event.title}:`, error.message);
      }
    }
    
    console.log(`\n✅ Successfully added ${insertedCount} Toronto events`);
    
    // Verify results
    console.log('\n🔍 Verifying results...');
    
    // Count Toronto events
    const finalTorontoEvents = await eventsCollection.find({ 
      $or: [
        { 'venue.city': 'Toronto' },
        { city: 'Toronto' }
      ]
    }).toArray();
    
    console.log(`🎉 Total Toronto events after update: ${finalTorontoEvents.length}`);
    
    // Display sample events
    if (finalTorontoEvents.length > 0) {
      console.log('\n📝 Sample Toronto events:');
      finalTorontoEvents.slice(0, 3).forEach(event => {
        console.log(`- ${event.title} at ${event.venue?.name || 'Unknown venue'}`);
      });
    }
    
    // Check for any remaining null IDs
    const nullIdCount = await eventsCollection.countDocuments({ id: null });
    console.log(`\n⚠️ Events with null ID: ${nullIdCount}`);
    
    // Total events in database
    const totalEvents = await eventsCollection.countDocuments();
    console.log(`📊 Total events in database: ${totalEvents}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('📡 Closed MongoDB connection');
  }
}

// Run the function
addTorontoEvents();
