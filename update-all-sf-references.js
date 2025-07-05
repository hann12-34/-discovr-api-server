/**
 * Comprehensive script to update all San Francisco references in the MongoDB database and JSON files
 */
require('dotenv').config(); // Load environment variables from .env file
const { MongoClient } = require('mongodb');
const fs = require('fs').promises;
const path = require('path');

async function updateAllSanFranciscoReferences() {
  let client;
  
  try {
    console.log('Starting comprehensive San Francisco to Vancouver update...');

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

    // 1. Update MongoDB database
    console.log('🔍 Finding events with San Francisco references in MongoDB...');
    
    // Count events with San Francisco references
    const sfCount = await eventsCollection.countDocuments({
      $or: [
        { 'venue.city': 'San Francisco' },
        { 'venue.state': 'CA' },
        { 'venue.country': 'US' },
        { title: { $regex: 'San Francisco', $options: 'i' } },
        { description: { $regex: 'San Francisco', $options: 'i' } },
        { location: { $regex: 'San Francisco', $options: 'i' } }
      ]
    });
    
    console.log(`Found ${sfCount} events with San Francisco references in MongoDB.`);

    // Update venue city, state, country
    console.log('🔄 Updating venue city, state, country...');
    const venueResult = await eventsCollection.updateMany(
      { 'venue.city': 'San Francisco' },
      { $set: { 'venue.city': 'Vancouver', 'venue.state': 'BC', 'venue.country': 'Canada' } }
    );
    
    console.log(`Updated ${venueResult.modifiedCount} events with San Francisco as city.`);
    
    // Update any remaining CA state references
    const stateResult = await eventsCollection.updateMany(
      { 'venue.state': 'CA' },
      { $set: { 'venue.state': 'BC', 'venue.country': 'Canada' } }
    );
    
    console.log(`Updated ${stateResult.modifiedCount} events with CA as state.`);
    
    // Update any remaining US country references
    const countryResult = await eventsCollection.updateMany(
      { 'venue.country': 'US' },
      { $set: { 'venue.country': 'Canada' } }
    );
    
    console.log(`Updated ${countryResult.modifiedCount} events with US as country.`);

    // Update San Francisco in titles
    console.log('🔄 Updating San Francisco references in titles...');
    const titleCursor = eventsCollection.find({ title: { $regex: 'San Francisco', $options: 'i' } });
    let titleUpdateCount = 0;
    
    await titleCursor.forEach(async (event) => {
      const updatedTitle = event.title.replace(/San Francisco/gi, 'Vancouver');
      await eventsCollection.updateOne(
        { _id: event._id },
        { $set: { title: updatedTitle } }
      );
      titleUpdateCount++;
    });
    
    console.log(`Updated ${titleUpdateCount} events with San Francisco in titles.`);
    
    // Update San Francisco in descriptions
    console.log('🔄 Updating San Francisco references in descriptions...');
    const descCursor = eventsCollection.find({ description: { $regex: 'San Francisco', $options: 'i' } });
    let descUpdateCount = 0;
    
    await descCursor.forEach(async (event) => {
      const updatedDesc = event.description.replace(/San Francisco/gi, 'Vancouver');
      await eventsCollection.updateOne(
        { _id: event._id },
        { $set: { description: updatedDesc } }
      );
      descUpdateCount++;
    });
    
    console.log(`Updated ${descUpdateCount} events with San Francisco in descriptions.`);
    
    // Update any location fields that might contain San Francisco
    console.log('🔄 Updating San Francisco references in location fields...');
    const locationResult = await eventsCollection.updateMany(
      { location: { $regex: 'San Francisco', $options: 'i' } },
      [{ $set: { location: { $replaceAll: { input: "$location", find: "San Francisco", replacement: "Vancouver" } } } }]
    );
    
    console.log(`Updated ${locationResult.modifiedCount} events with San Francisco in location field.`);

    // 2. Update JSON files
    console.log('🔍 Finding and updating JSON files with San Francisco references...');
    
    // List of JSON files to check
    const jsonFiles = [
      path.join(__dirname, 'cloud-api-events.json'),
      path.join(__dirname, 'mongodb-direct-events.json'),
      path.join(__dirname, 'exports', 'events_export_2025-06-28T21-20-58.json')
    ];
    
    for (const filePath of jsonFiles) {
      try {
        console.log(`Processing ${filePath}...`);
        
        // Read the file
        const fileContent = await fs.readFile(filePath, 'utf8');
        
        // Replace San Francisco with Vancouver
        const updatedContent = fileContent
          .replace(/San Francisco/g, 'Vancouver')
          .replace(/"city":\s*"San Francisco"/g, '"city": "Vancouver"')
          .replace(/"state":\s*"CA"/g, '"state": "BC"')
          .replace(/"country":\s*"US"/g, '"country": "Canada"');
        
        // Write the updated content back to the file
        await fs.writeFile(filePath, updatedContent, 'utf8');
        
        console.log(`✅ Updated ${filePath}`);
      } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
      }
    }

    // 3. Check if there are any remaining San Francisco references in MongoDB
    const remainingSF = await eventsCollection.countDocuments({
      $or: [
        { 'venue.city': 'San Francisco' },
        { 'venue.state': 'CA' },
        { 'venue.country': 'US' },
        { title: { $regex: 'San Francisco', $options: 'i' } },
        { description: { $regex: 'San Francisco', $options: 'i' } },
        { location: { $regex: 'San Francisco', $options: 'i' } }
      ]
    });
    
    console.log(`Remaining events with San Francisco references in MongoDB: ${remainingSF}`);
    
    // Check total events
    const totalEvents = await eventsCollection.countDocuments();
    console.log(`Total events in database: ${totalEvents}`);
    
    console.log('✅ Update complete!');

  } catch (error) {
    console.error('❌ Error updating references:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Disconnected from MongoDB.');
    }
  }
}

// Run the update
updateAllSanFranciscoReferences();
