/**
 * Script to add Toronto events one by one to identify specific issues
 */

const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection URI
const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/discovr?retryWrites=true&w=majority';

// Connect to MongoDB
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => {
  console.error('❌ Failed to connect to MongoDB:', err);
  process.exit(1);
});

// Define Event schema for MongoDB
const eventSchema = new mongoose.Schema({}, { strict: false });
const Event = mongoose.model('Event', eventSchema, 'events');

async function addTorontoEventsOneByOne() {
  try {
    // Delete any existing Toronto events to avoid conflicts
    const deleteTorontoResult = await Event.deleteMany({
      $or: [
        { 'venue.city': 'Toronto' },
        { city: 'Toronto' },
      ]
    });
    
    console.log(`🗑️ Deleted ${deleteTorontoResult.deletedCount} existing Toronto events`);
    
    // Toronto events array
    const torontoEvents = [
      {
        id: 'tor-001',
        name: "Toronto Symphony Orchestra - Mozart's Jupiter Symphony",
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
        lastUpdated: new Date(),
        city: 'Toronto',
        categories: ['Toronto', 'Classical', 'Concert']
      },
      {
        id: 'tor-002',
        name: "Toronto Jazz Festival - Main Stage",
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
        lastUpdated: new Date(),
        city: 'Toronto',
        categories: ['Toronto', 'Jazz', 'Festival', 'Music']
      },
      {
        id: 'tor-003',
        name: "Immersive Van Gogh Exhibition",
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
        lastUpdated: new Date(),
        city: 'Toronto',
        categories: ['Toronto', 'Art', 'Exhibition']
      }
    ];
    
    // Insert events one by one
    let insertedCount = 0;
    
    for (const event of torontoEvents) {
      try {
        console.log(`Inserting event: ${event.title}`);
        const newEvent = new Event(event);
        await newEvent.save();
        console.log(`✅ Successfully added: ${event.title}`);
        insertedCount++;
      } catch (error) {
        console.error(`❌ Error inserting event ${event.title}:`, error.message);
      }
    }
    
    console.log(`✅ Added ${insertedCount} new Toronto events`);
    
    // Get final count of Toronto events
    const finalTorontoEvents = await Event.find({ 
      $or: [
        { 'venue.city': 'Toronto' },
        { city: 'Toronto' },
      ]
    });
    
    console.log(`🎉 Total Toronto events after update: ${finalTorontoEvents.length}`);
    
    // Display sample events
    if (finalTorontoEvents.length > 0) {
      console.log('\n📝 Sample Toronto events:');
      finalTorontoEvents.slice(0, 3).forEach(event => {
        console.log(`- ${event.title || event.name} at ${event.venue?.name || 'Unknown venue'}`);
      });
    }
    
    // Check how many documents actually exist in the collection
    const totalEvents = await Event.countDocuments();
    console.log(`📊 Total events in database: ${totalEvents}`);
    
  } catch (error) {
    console.error('❌ Error adding Toronto events:', error);
  } finally {
    // Close the MongoDB connection
    mongoose.connection.close();
    console.log('📡 Closed MongoDB connection');
  }
}

// Run the function
addTorontoEventsOneByOne();
