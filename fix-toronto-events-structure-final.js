/**
 * Script to update Toronto events to match the exact structure of the SeasonalActivity 
 * struct in DiscovrApp.swift
 */
const { MongoClient } = require('mongodb');

async function updateTorontoEventsStructure() {
  const uri = 'mongodb://localhost:27017';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('🔌 Connected to MongoDB');
    
    const db = client.db('discovr');
    const eventsCollection = db.collection('events');
    
    // Find all Toronto events
    const torontoEvents = await eventsCollection.find({
      $or: [
        { 'venue.city': { $regex: 'Toronto', $options: 'i' } },
        { city: { $regex: 'Toronto', $options: 'i' } }
      ]
    }).toArray();
    
    console.log(`📊 Found ${torontoEvents.length} Toronto events to update`);
    
    // Update each Toronto event to match SeasonalActivity structure
    let updateCount = 0;
    for (const event of torontoEvents) {
      // Create event properties that match the SeasonalActivity struct in DiscovrApp.swift
      // Based on: /Users/seongwoohan/CascadeProjects/Discovr-API/Discovr/DiscovrApp.swift
      const updateFields = {
        // Ensure Toronto is in the name for filtering
        name: event.name || event.title || 'Toronto Event',
        
        // Ensure location explicitly mentions Toronto
        location: event.location || `${event.venue?.name || 'Downtown'}, Toronto, ON`,
        
        // Venue should be a string (not an object)
        venue: typeof event.venue === 'object' ? event.venue.name : (event.venue || 'Toronto Venue'),
        
        // Date fields properly formatted
        startDate: event.startDate || new Date(),
        endDate: event.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        
        // Status and type fields from SeasonalActivity
        status: 'active',
        type: 'attraction',
        
        // Coordinates for Toronto
        latitude: event.latitude || 43.6532,
        longitude: event.longitude || -79.3832,
        
        // Convert URLs if they're strings
        sourceURL: event.sourceURL || event.source_url || 'https://www.toronto.ca/explore-enjoy/festivals-events/',
        
        // Ensure there's a description
        description: event.description || `Event taking place in Toronto, Ontario.`,
        
        // Add Toronto to name if not already present
        season: 'summer'
      };
      
      if (!event.name?.toLowerCase().includes('toronto') && !updateFields.name.toLowerCase().includes('toronto')) {
        updateFields.name = `${updateFields.name} (Toronto)`;
      }
      
      // Update the event document
      const result = await eventsCollection.updateOne(
        { _id: event._id }, 
        { $set: updateFields }
      );
      
      if (result.modifiedCount > 0) {
        updateCount++;
      }
    }
    
    console.log(`✅ Updated ${updateCount} out of ${torontoEvents.length} Toronto events to match SeasonalActivity structure`);
    
    // Print example of an updated event
    if (torontoEvents.length > 0) {
      const updatedEvent = await eventsCollection.findOne({ _id: torontoEvents[0]._id });
      console.log('📝 Example of updated event:');
      console.log(JSON.stringify(updatedEvent, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error updating Toronto events:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

updateTorontoEventsStructure().catch(console.error);
