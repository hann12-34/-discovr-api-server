/**
 * Script to find and update the remaining San Francisco reference in the MongoDB database
 */
require('dotenv').config(); // Load environment variables from .env file
const { MongoClient } = require('mongodb');

async function updateRemainingSanFranciscoReferences() {
  let client;
  
  try {
    console.log('Starting search for remaining San Francisco references...');

    // Connect to MongoDB directly with MongoClient
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in your .env file.');
    }

    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB directly');
    
    // Get database and collection
    const db = client.db('discovr'); // Explicitly use the 'discovr' database
    const eventsCollection = db.collection('events');

    // Find the remaining event with San Francisco references
    console.log('🔍 Finding remaining event with San Francisco references...');
    
    const remainingEvent = await eventsCollection.findOne({
      $or: [
        { 'venue.city': 'San Francisco' },
        { 'venue.state': 'CA' },
        { 'venue.country': 'US' },
        { title: { $regex: 'San Francisco', $options: 'i' } },
        { description: { $regex: 'San Francisco', $options: 'i' } },
        { location: { $regex: 'San Francisco', $options: 'i' } },
        { categories: { $in: ['san francisco'] } },
        { category: { $regex: 'san francisco', $options: 'i' } }
      ]
    });
    
    if (remainingEvent) {
      console.log('Found remaining event:');
      console.log(`ID: ${remainingEvent._id}`);
      console.log(`Title: ${remainingEvent.title}`);
      console.log(`Venue: ${JSON.stringify(remainingEvent.venue)}`);
      console.log(`Categories: ${JSON.stringify(remainingEvent.categories)}`);
      
      // Update the event with Vancouver references
      console.log('🔄 Updating remaining event...');
      
      // Create a deep copy of the event to modify
      const updatedEvent = JSON.parse(JSON.stringify(remainingEvent));
      
      // Update all fields that might contain San Francisco
      if (updatedEvent.venue) {
        updatedEvent.venue.city = updatedEvent.venue.city.replace(/San Francisco/gi, 'Vancouver');
        updatedEvent.venue.state = 'BC';
        updatedEvent.venue.country = 'Canada';
      }
      
      if (updatedEvent.title) {
        updatedEvent.title = updatedEvent.title.replace(/San Francisco/gi, 'Vancouver');
      }
      
      if (updatedEvent.description) {
        updatedEvent.description = updatedEvent.description.replace(/San Francisco/gi, 'Vancouver');
      }
      
      if (updatedEvent.location) {
        updatedEvent.location = updatedEvent.location.replace(/San Francisco/gi, 'Vancouver');
      }
      
      // Update categories array
      if (updatedEvent.categories && Array.isArray(updatedEvent.categories)) {
        updatedEvent.categories = updatedEvent.categories.map(cat => 
          cat.toLowerCase() === 'san francisco' ? 'vancouver' : cat
        );
      }
      
      // Update the event in the database
      await eventsCollection.updateOne(
        { _id: remainingEvent._id },
        { $set: updatedEvent }
      );
      
      console.log('✅ Updated remaining event.');
    } else {
      console.log('No remaining events with San Francisco references found.');
    }
    
    // Check if there are any remaining San Francisco references
    const remainingSF = await eventsCollection.countDocuments({
      $or: [
        { 'venue.city': 'San Francisco' },
        { 'venue.state': 'CA' },
        { 'venue.country': 'US' },
        { title: { $regex: 'San Francisco', $options: 'i' } },
        { description: { $regex: 'San Francisco', $options: 'i' } },
        { location: { $regex: 'San Francisco', $options: 'i' } },
        { categories: { $in: ['san francisco'] } },
        { category: { $regex: 'san francisco', $options: 'i' } }
      ]
    });
    
    console.log(`Remaining events with San Francisco references: ${remainingSF}`);
    
    // Check total events
    const totalEvents = await eventsCollection.countDocuments();
    console.log(`Total events in database: ${totalEvents}`);

  } catch (error) {
    console.error('❌ Error updating events:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Disconnected from MongoDB.');
    }
  }
}

// Run the update
updateRemainingSanFranciscoReferences();
