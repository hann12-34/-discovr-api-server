/**
 * Script to deploy events from local MongoDB to the cloud API
 * 
 * This script reads events from the local MongoDB database and uploads them
 * to the cloud API so they appear in the Discovr app
 */

const mongoose = require('mongoose');
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

// MongoDB connection string
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/discovr';

// Cloud API configuration
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

async function deployEventsToCloud() {
  console.log('🔄 Deploying local MongoDB events to cloud API...');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to local MongoDB');

    // Get the Event model
    const Event = mongoose.model('Event', eventSchema);
    
    // Count events in local database
    const eventCount = await Event.countDocuments();
    console.log(`📊 Found ${eventCount} events in local database`);
    
    if (eventCount === 0) {
      console.log('❌ No events found in local database. Nothing to deploy.');
      await mongoose.disconnect();
      return;
    }
    
    // Get all events from local database
    const events = await Event.find({});
    console.log(`📤 Uploading ${events.length} events to cloud API...`);
    
    // Track results
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    // Upload events in batches to avoid overwhelming the API
    const batchSize = 10;
    
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(events.length/batchSize)}...`);
      
      for (const event of batch) {
        try {
          // Format the event properly for the API
          const apiEvent = {
            title: event.title,
            description: event.description || '',
            startDate: event.startDate,
            endDate: event.endDate || event.startDate,
            venue: event.venue || {
              name: 'Unknown Venue',
              location: { address: '', city: 'Vancouver', province: 'BC', country: 'Canada' }
            },
            category: event.category || 'Music',
            image: event.image || '',
            sourceURL: event.sourceURL || '',
            officialWebsite: event.officialWebsite || ''
          };
          
          try {
            // Directly post event to the cloud API
            // The API will handle duplicate detection based on event properties
            await axios.post(EVENTS_ENDPOINT, apiEvent);
            console.log(`✅ Uploaded: ${apiEvent.title}`);
            successCount++;
          } catch (error) {
            if (error.response && error.response.status === 409) {
              // 409 Conflict means the event already exists
              console.log(`Skipping duplicate event: ${apiEvent.title}`);
              skipCount++;
            } else {
              throw error; // Re-throw to be caught by the outer catch
            }
          }
        } catch (error) {
          console.error(`❌ Error uploading event "${event.title}":`, error.message);
          errorCount++;
        }
      }
    }
    
    // Print summary
    console.log('\n📊 DEPLOYMENT SUMMARY');
    console.log('====================');
    console.log(`Total events processed: ${events.length}`);
    console.log(`Successfully uploaded: ${successCount}`);
    console.log(`Skipped (already exist): ${skipCount}`);
    console.log(`Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('✅ Disconnected from local MongoDB');
  }
}

// Run the deployment
deployEventsToCloud().catch(console.error);
