/**
 * Export events from local MongoDB to JSON format
 * 
 * This script connects to your local MongoDB, exports all events to a JSON file,
 * and provides instructions for importing them to the cloud database.
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

// MongoDB connection string
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/discovr';

// Event schema for MongoDB
const eventSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: String,
  description: String,
  date: String,
  startDate: Date,
  endDate: Date,
  image: String,
  venue: Object,
  category: String,
  categories: [String],
  sourceURL: String,
  ticketURL: String,
  location: String,
  lastUpdated: Date
}, { strict: false });

async function exportEvents() {
  console.log('📤 Exporting events from local MongoDB to JSON...');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to local MongoDB');

    // Get the Event model
    const Event = mongoose.model('Event', eventSchema);
    
    // Get all events from local database
    const events = await Event.find({});
    console.log(`📊 Found ${events.length} events in local database`);
    
    if (events.length === 0) {
      console.log('❌ No events found in local database. Nothing to export.');
      return;
    }

    // Format events for cloud database
    const formattedEvents = events.map(event => {
      // Convert Mongoose document to plain object
      const plainEvent = event.toObject();
      
      // Remove MongoDB specific fields that might cause issues
      delete plainEvent._id;
      delete plainEvent.__v;
      
      return {
        id: plainEvent.id,
        title: plainEvent.title,
        description: plainEvent.description || '',
        startDate: plainEvent.startDate,
        endDate: plainEvent.endDate || plainEvent.startDate,
        venue: plainEvent.venue || {
          name: plainEvent.venue?.name || 'Unknown Venue',
          location: plainEvent.venue?.location || { 
            address: '', 
            city: 'Vancouver', 
            province: 'BC', 
            country: 'Canada' 
          }
        },
        category: plainEvent.category || 'Music',
        categories: plainEvent.categories || ['Music'],
        image: plainEvent.image || '',
        sourceURL: plainEvent.sourceURL || '',
        officialWebsite: plainEvent.officialWebsite || '',
        ticketURL: plainEvent.ticketURL || '',
        location: plainEvent.location || 'Vancouver, BC',
        lastUpdated: plainEvent.lastUpdated || new Date()
      };
    });

    // Create exports directory if it doesn't exist
    const exportsDir = path.join(__dirname, 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir);
    }

    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const filename = `events_export_${timestamp}.json`;
    const filePath = path.join(exportsDir, filename);

    // Write events to JSON file
    fs.writeFileSync(filePath, JSON.stringify(formattedEvents, null, 2));
    console.log(`✅ Successfully exported ${formattedEvents.length} events to ${filePath}`);

    // Print import instructions
    console.log('\n📝 IMPORT INSTRUCTIONS');
    console.log('====================');
    console.log('To import these events to your cloud MongoDB:');
    console.log('');
    console.log('Option 1: Using MongoDB Compass');
    console.log('1. Open MongoDB Compass');
    console.log('2. Connect to your cloud MongoDB instance');
    console.log('3. Navigate to the "discovr" database and "events" collection');
    console.log('4. Click "Add Data" > "Import JSON or CSV file"');
    console.log(`5. Select the exported file at: ${filePath}`);
    console.log('6. Choose "JSON" as the file type and click "Import"');
    console.log('');
    console.log('Option 2: Using mongoimport CLI tool');
    console.log(`mongoimport --uri="YOUR_CLOUD_MONGODB_URI" --collection=events --file=${filePath} --jsonArray`);
    console.log('');
    console.log('After importing, your events should appear in the Discovr app!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('✅ Disconnected from local MongoDB');
  }
}

// Run the export
exportEvents().catch(console.error);
