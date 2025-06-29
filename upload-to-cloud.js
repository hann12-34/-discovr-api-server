/**
 * Upload events from local MongoDB to the cloud API
 * 
 * This script directly pushes events from the local MongoDB to the cloud API
 * using the correct endpoint
 */

const mongoose = require('mongoose');
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

// MongoDB connection string
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/discovr';

// Cloud API configuration - using the exact endpoint from the app logs
const API_BASE_URL = 'https://discovr-api-test-531591199325.northamerica-northeast2.run.app/api/v1';
const EVENTS_ENDPOINT = `${API_BASE_URL}/venues/events`;

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

async function uploadToCloud() {
  console.log('🚀 Uploading events from local MongoDB to cloud API...');

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
      console.log('❌ No events found in local database. Nothing to upload.');
      return;
    }

    // Prepare events for cloud API by formatting them correctly
    const apiEvents = events.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description || '',
      startDate: event.startDate,
      endDate: event.endDate || event.startDate,
      venue: event.venue || {
        name: 'Fortune Sound Club',
        location: { address: '', city: 'Vancouver', province: 'BC', country: 'Canada' }
      },
      category: event.category || 'Music',
      image: event.image || '',
      sourceURL: event.sourceURL || '',
      officialWebsite: event.officialWebsite || '',
      ticketURL: event.ticketURL || ''
    }));

    console.log(`📤 Uploading ${apiEvents.length} events to cloud API...`);
    
    // Use POST request to upload all events at once
    try {
      const response = await axios.post(`${EVENTS_ENDPOINT}/batch`, apiEvents);
      console.log(`✅ Successfully uploaded events to cloud API`);
      console.log(`📊 Response: ${JSON.stringify(response.data)}`);
    } catch (error) {
      console.error('❌ Error uploading events to cloud API:');
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Message: ${JSON.stringify(error.response.data)}`);
      } else {
        console.error(error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('✅ Disconnected from local MongoDB');
  }
}

// Run the upload
uploadToCloud().catch(console.error);
