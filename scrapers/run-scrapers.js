/**
 * Script to manually run all scrapers
 * This can be used for testing or for initializing the database with event data
 */

require('dotenv').config();
const mongoose = require('mongoose');
const scraperCoordinator = require('./scrapers');

// Import your Event model from a separate file to ensure consistency
// If you're using the model directly, define it here
const eventSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: String,
  image: String,
  startDate: Date,
  endDate: Date,
  season: String,
  location: String,
  venue: {
    name: String,
    address: String,
    city: String,
    state: String,
    country: String
  },
  category: String,
  priceRange: String,
  sourceURL: String,
  officialWebsite: String,
  dataSources: [String],
  lastUpdated: { type: Date, default: Date.now }
});

const Event = mongoose.model('Event', eventSchema);

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/discovr';

async function runScrapers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000
    });
    console.log('Connected to MongoDB');

    console.log('Initializing scraper coordinator...');
    await scraperCoordinator.init({
      eventModel: Event,
      autoSchedule: false
    });
    
    console.log('Running all scrapers...');
    const events = await scraperCoordinator.runScrapers();
    
    console.log(`Scrapers found ${events.length} events`);
    
    // Display summary of events by source
    const sourceCount = {};
    events.forEach(event => {
      if (event.dataSources && event.dataSources.length > 0) {
        event.dataSources.forEach(source => {
          sourceCount[source] = (sourceCount[source] || 0) + 1;
        });
      }
    });
    
    console.log('Events by source:');
    Object.keys(sourceCount).forEach(source => {
      console.log(`- ${source}: ${sourceCount[source]}`);
    });
    
    // Display summary of events by category
    const categoryCount = {};
    events.forEach(event => {
      categoryCount[event.category] = (categoryCount[event.category] || 0) + 1;
    });
    
    console.log('Events by category:');
    Object.keys(categoryCount).forEach(category => {
      console.log(`- ${category}: ${categoryCount[category]}`);
    });
    
    console.log('Scraper run complete');
  } catch (error) {
    console.error('Error running scrapers:', error);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  }
}

// Run the scraper function
runScrapers();
