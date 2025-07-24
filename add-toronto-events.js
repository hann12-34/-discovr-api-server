/**
 * Script to add Toronto events to the database using the correct schema
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

// Define Event schema for MongoDB - loose schema to match what's in the DB
const eventSchema = new mongoose.Schema({}, { strict: false });
const Event = mongoose.model('Event', eventSchema, 'events');

async function addTorontoEvents() {
  try {
    // Delete any existing Toronto events to avoid conflicts
    const deleteTorontoResult = await Event.deleteMany({
      'venue.city': 'Toronto'
    });
    
    console.log(`🗑️ Deleted ${deleteTorontoResult.deletedCount} existing Toronto events`);
    
    // Create Toronto events using the schema structure from the existing database
    const torontoEvents = [
      {
        id: 'tor-001',
        title: "Toronto Symphony Orchestra - Mozart's Jupiter Symphony",
        description: "Experience the brilliance of Mozart's final symphony, known as 'Jupiter,' performed by the renowned Toronto Symphony Orchestra. Led by Music Director Gustavo Gimeno, this performance showcases Mozart's masterpiece alongside works by contemporary composers.",
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
        title: "Toronto Jazz Festival - Main Stage",
        description: "The TD Toronto Jazz Festival returns with a stellar lineup of local and international jazz artists. The festival transforms Nathan Phillips Square into a vibrant hub of music with multiple stages, food vendors, and special events.",
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
        title: "Immersive Van Gogh Exhibition",
        description: "Step into the extraordinary world of Vincent van Gogh in this immersive art experience. State-of-the-art technology transforms the iconic works of van Gogh into a captivating digital art installation.",
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
      },
      {
        id: 'tor-004',
        title: "Royal Ontario Museum - Egyptian Mummies Exhibition",
        description: "Discover the fascinating world of ancient Egyptian burial practices and mummification in this special exhibition at the Royal Ontario Museum. The exhibition features mummies, coffins, and funerary artifacts.",
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
        lastUpdated: new Date(),
        city: 'Toronto',
        categories: ['Toronto', 'Museum', 'Exhibition', 'History']
      },
      {
        id: 'tor-005',
        title: "Toronto Maple Leafs vs Montreal Canadiens",
        description: "Witness one of hockey's greatest rivalries as the Toronto Maple Leafs face off against the Montreal Canadiens in this regular season NHL game. The historic rivalry between these two Original Six teams always delivers excitement and passionate play.",
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
        lastUpdated: new Date(),
        city: 'Toronto',
        categories: ['Toronto', 'Sports', 'Hockey']
      }
    ];
    
    // Insert the events
    const insertResult = await Event.insertMany(torontoEvents);
    console.log(`✅ Added ${insertResult.length} new Toronto events`);
    
    // Get final count of Toronto events
    const finalTorontoEvents = await Event.find({ city: 'Toronto' });
    console.log(`🎉 Total Toronto events after update: ${finalTorontoEvents.length}`);
    
    // Display sample events
    if (finalTorontoEvents.length > 0) {
      console.log('\n📝 Sample Toronto events:');
      finalTorontoEvents.slice(0, 3).forEach(event => {
        console.log(`- ${event.title} at ${event.venue?.name || 'Unknown venue'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error adding Toronto events:', error);
  } finally {
    // Close the MongoDB connection
    mongoose.connection.close();
    console.log('📡 Closed MongoDB connection');
  }
}

// Run the function
addTorontoEvents();
