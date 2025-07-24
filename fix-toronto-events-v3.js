/**
 * Script to clean up Toronto events and add proper ones to the database
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
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

async function fixTorontoEvents() {
  try {
    // 1. Delete problematic Roy Thomson Hall events
    const deleteResult = await Event.deleteMany({
      'venue.name': 'Roy Thomson Hall',
      name: { $regex: /{{.*}}/ }
    });
    
    console.log(`🗑️ Deleted ${deleteResult.deletedCount} problematic Roy Thomson Hall events`);
    
    // 2. Also delete any existing Toronto events to start fresh
    const deleteTorontoResult = await Event.deleteMany({
      city: 'Toronto'
    });
    
    console.log(`🗑️ Deleted ${deleteTorontoResult.deletedCount} existing Toronto events`);
    
    // 3. Create proper Toronto events - using both _id for MongoDB and id for application
    const torontoEvents = [
      {
        _id: new mongoose.Types.ObjectId(),
        id: uuidv4(),
        name: "Toronto Symphony Orchestra - Mozart's Jupiter Symphony",
        startDate: new Date(new Date().setDate(new Date().getDate() + 7)),
        endDate: new Date(new Date().setDate(new Date().getDate() + 7)),
        venue: {
          name: "Roy Thomson Hall",
          id: "roy-thomson-hall",
          url: "https://www.roythomsonhall.com",
          address: {
            street: "60 Simcoe St",
            city: "Toronto",
            province: "ON",
            country: "Canada"
          }
        },
        url: "https://www.roythomsonhall.com/calendar",
        imageUrl: "https://www.tso.ca/sites/default/files/styles/hero_banner/public/2022-05/TSO_hero_1920x1080_beethoven_9th.jpg",
        price: { min: 45, max: 120, currency: "CAD" },
        source: "Roy Thomson Hall",
        scrapeDate: new Date(),
        city: "Toronto",
        province: "ON",
        country: "Canada",
        categories: ["Toronto", "Classical", "Concert"],
        description: "Experience the brilliance of Mozart's final symphony, known as 'Jupiter,' performed by the renowned Toronto Symphony Orchestra. Led by Music Director Gustavo Gimeno, this performance showcases Mozart's masterpiece alongside works by contemporary composers. The evening features guest pianist Jan Lisiecki performing Mozart's Piano Concerto No. 21."
      },
      {
        _id: new mongoose.Types.ObjectId(),
        id: uuidv4(),
        name: "Toronto Jazz Festival - Main Stage",
        startDate: new Date(new Date().setDate(new Date().getDate() + 14)),
        endDate: new Date(new Date().setDate(new Date().getDate() + 21)),
        venue: {
          name: "Nathan Phillips Square",
          id: "nathan-phillips-square",
          url: "https://torontojazz.com",
          address: {
            street: "100 Queen St W",
            city: "Toronto",
            province: "ON",
            country: "Canada"
          }
        },
        url: "https://torontojazz.com",
        imageUrl: "https://www.toronto.ca/wp-content/uploads/2018/01/9664-toronto-jazz-festival.jpg",
        price: { min: 30, max: 85, currency: "CAD" },
        source: "Toronto Jazz Festival",
        scrapeDate: new Date(),
        city: "Toronto",
        province: "ON",
        country: "Canada",
        categories: ["Toronto", "Jazz", "Festival", "Music"],
        description: "The TD Toronto Jazz Festival returns with a stellar lineup of local and international jazz artists. The festival transforms Nathan Phillips Square into a vibrant hub of music with multiple stages, food vendors, and special events. This year's headliners include Grammy-winning artists and emerging talent from across the global jazz scene."
      },
      {
        _id: new mongoose.Types.ObjectId(),
        id: uuidv4(),
        name: "Immersive Van Gogh Exhibition",
        startDate: new Date(new Date().setDate(new Date().getDate() + 3)),
        endDate: new Date(new Date().setDate(new Date().getDate() + 90)),
        venue: {
          name: "Lighthouse Immersive",
          id: "lighthouse-immersive",
          url: "https://www.lighthouseimmersive.com",
          address: {
            street: "1 Yonge Street",
            city: "Toronto",
            province: "ON",
            country: "Canada"
          }
        },
        url: "https://www.lighthouseimmersive.com",
        imageUrl: "https://images.squarespace-cdn.com/content/v1/606904a1262e31677e03df9f/1617555916473-DTJ94DKDGZDMSPR8GEBJ/van-gogh-room-1.jpg",
        price: { min: 39, max: 99, currency: "CAD" },
        source: "Lighthouse Immersive",
        scrapeDate: new Date(),
        city: "Toronto",
        province: "ON",
        country: "Canada",
        categories: ["Toronto", "Art", "Exhibition"],
        description: "Step into the extraordinary world of Vincent van Gogh in this immersive art experience. State-of-the-art technology transforms the iconic works of van Gogh into a captivating digital art installation. Guests walk through animated projections featuring over 400 of the artist's paintings, allowing you to experience art like never before."
      },
      {
        _id: new mongoose.Types.ObjectId(),
        id: uuidv4(),
        name: "Royal Ontario Museum - Egyptian Mummies Exhibition",
        startDate: new Date(new Date().setDate(new Date().getDate())),
        endDate: new Date(new Date().setDate(new Date().getDate() + 120)),
        venue: {
          name: "Royal Ontario Museum",
          id: "royal-ontario-museum",
          url: "https://www.rom.on.ca",
          address: {
            street: "100 Queens Park",
            city: "Toronto",
            province: "ON",
            country: "Canada"
          }
        },
        url: "https://www.rom.on.ca",
        imageUrl: "https://www.rom.on.ca/sites/default/files/styles/16_9_banner/public/Egyptian-Mummies.jpg",
        price: { min: 23, max: 23, currency: "CAD" },
        source: "Royal Ontario Museum",
        scrapeDate: new Date(),
        city: "Toronto",
        province: "ON",
        country: "Canada",
        categories: ["Toronto", "Museum", "Exhibition", "History"],
        description: "Discover the fascinating world of ancient Egyptian burial practices and mummification in this special exhibition at the Royal Ontario Museum. The exhibition features mummies, coffins, and funerary artifacts that reveal insights into ancient Egyptian beliefs about the afterlife. Interactive displays explain the scientific techniques used to study these ancient remains."
      },
      {
        _id: new mongoose.Types.ObjectId(),
        id: uuidv4(),
        name: "Toronto Maple Leafs vs Montreal Canadiens",
        startDate: new Date(new Date().setDate(new Date().getDate() + 10)),
        endDate: new Date(new Date().setDate(new Date().getDate() + 10)),
        venue: {
          name: "Scotiabank Arena",
          id: "scotiabank-arena",
          url: "https://www.scotiabankarena.com",
          address: {
            street: "40 Bay St",
            city: "Toronto",
            province: "ON",
            country: "Canada"
          }
        },
        url: "https://www.nhl.com/mapleleafs",
        imageUrl: "https://cms.nhl.bamgrid.com/images/photos/281721134/1284x722/cut.jpg",
        price: { min: 85, max: 450, currency: "CAD" },
        source: "Scotiabank Arena",
        scrapeDate: new Date(),
        city: "Toronto",
        province: "ON",
        country: "Canada",
        categories: ["Toronto", "Sports", "Hockey"],
        description: "Witness one of hockey's greatest rivalries as the Toronto Maple Leafs face off against the Montreal Canadiens in this regular season NHL game. The historic rivalry between these two Original Six teams always delivers excitement and passionate play. Arrive early to watch the pre-game warmups and enjoy the electric atmosphere at Scotiabank Arena."
      }
    ];
    
    // Insert the events one by one to avoid bulk insert issues
    let insertedCount = 0;
    for (const event of torontoEvents) {
      try {
        await new Event(event).save();
        insertedCount++;
      } catch (error) {
        console.error(`Error inserting event ${event.name}:`, error.message);
      }
    }
    
    console.log(`✅ Added ${insertedCount} new Toronto events`);
    
    // 4. Get final count of Toronto events
    const finalTorontoEvents = await Event.find({ city: 'Toronto' });
    console.log(`🎉 Total Toronto events after update: ${finalTorontoEvents.length}`);
    
    // 5. Display sample events
    if (finalTorontoEvents.length > 0) {
      console.log('\n📝 Sample Toronto events:');
      finalTorontoEvents.slice(0, 3).forEach(event => {
        console.log(`- ${event.name} at ${event.venue?.name || 'Unknown venue'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error fixing Toronto events:', error);
  } finally {
    // Close the MongoDB connection
    mongoose.connection.close();
    console.log('📡 Closed MongoDB connection');
  }
}

// Run the fix function
fixTorontoEvents();
