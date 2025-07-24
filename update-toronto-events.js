/**
 * Script to update Toronto events in the database to ensure they have the city field set
 */

const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection URI from .env file
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

async function updateTorontoEvents() {
  try {
    // 1. First, find events with Toronto in categories array
    const eventsWithTorontoCategory = await Event.find({
      categories: { $in: ['Toronto'] }
    });
    
    console.log(`📊 Found ${eventsWithTorontoCategory.length} events with Toronto in categories`);
    
    // 2. Update these events to set city field to Toronto
    if (eventsWithTorontoCategory.length > 0) {
      const updateResults = await Promise.all(
        eventsWithTorontoCategory.map(event => 
          Event.updateOne(
            { _id: event._id },
            { $set: { city: 'Toronto' } }
          )
        )
      );
      
      console.log(`✅ Updated ${updateResults.filter(r => r.modifiedCount > 0).length} events with city field`);
    }
    
    // 3. Find events with Toronto venue names
    const torontoVenueNames = [
      'Roy Thomson Hall', 
      'Meridian Hall', 
      'Massey Hall', 
      'Toronto Jazz Festival', 
      'Lighthouse Immersive',
      'Toronto Events'
    ];
    
    const eventsWithTorontoVenues = await Event.find({
      'venue.name': { $in: torontoVenueNames }
    });
    
    console.log(`📊 Found ${eventsWithTorontoVenues.length} events with Toronto venues`);
    
    // 4. Update these events to set city field to Toronto
    if (eventsWithTorontoVenues.length > 0) {
      const updateResults = await Promise.all(
        eventsWithTorontoVenues.map(event => 
          Event.updateOne(
            { _id: event._id },
            { 
              $set: { city: 'Toronto' },
              $addToSet: { categories: 'Toronto' }
            }
          )
        )
      );
      
      console.log(`✅ Updated ${updateResults.filter(r => r.modifiedCount > 0).length} events with Toronto venues`);
    }
    
    // 5. Find events with Toronto in the name
    const eventsWithTorontoInName = await Event.find({
      name: { $regex: /toronto/i }
    });
    
    console.log(`📊 Found ${eventsWithTorontoInName.length} events with Toronto in the name`);
    
    // 6. Update these events to set city field to Toronto
    if (eventsWithTorontoInName.length > 0) {
      const updateResults = await Promise.all(
        eventsWithTorontoInName.map(event => 
          Event.updateOne(
            { _id: event._id },
            { 
              $set: { city: 'Toronto' },
              $addToSet: { categories: 'Toronto' }
            }
          )
        )
      );
      
      console.log(`✅ Updated ${updateResults.filter(r => r.modifiedCount > 0).length} events with Toronto in name`);
    }
    
    // 7. Get final count of Toronto events
    const finalTorontoEvents = await Event.find({ city: 'Toronto' });
    console.log(`🎉 Total Toronto events after update: ${finalTorontoEvents.length}`);
    
    // 8. Display sample events
    if (finalTorontoEvents.length > 0) {
      console.log('\n📝 Sample Toronto events:');
      finalTorontoEvents.slice(0, 3).forEach(event => {
        console.log(`- ${event.name} at ${event.venue?.name || 'Unknown venue'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error updating Toronto events:', error);
  } finally {
    // Close the MongoDB connection
    mongoose.connection.close();
    console.log('📡 Closed MongoDB connection');
  }
}

// Run the update function
updateTorontoEvents();
