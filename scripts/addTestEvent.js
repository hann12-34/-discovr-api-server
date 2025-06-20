// Script to add a test event to the database
require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('../models/Event');

async function addTestEvent() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Create a test event
    const testEvent = new Event({
      name: 'Test Event from API',
      description: 'This is a test event added directly to the database for API testing.',
      location: 'API Test Location, Vancouver',
      latitude: 49.2827,
      longitude: -123.1207,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      imageURL: 'https://via.placeholder.com/300',
      sourceURL: 'http://example.com/event',
      type: 'outdoor',
      price: 'Free',
      source: 'API Test',
      season: 'summer',
      status: 'upcoming'
    });
    
    await testEvent.save();
    console.log('Test event created successfully:', testEvent);
  } catch (error) {
    console.error('Error adding test event:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the function
addTestEvent();
