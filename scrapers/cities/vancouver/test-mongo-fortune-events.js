const mongoose = require('mongoose');

// MongoDB connection - using hardcoded connection string from test-mongodb-connection.js
const mongoURI = "mongodb+srv://materaccount:materaccount123@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr";

// Mask the password in the URI for logging
const maskedURI = mongoURI.replace(/:([^:@]+)@/, ':*****@');
console.log(`Using MongoDB connection: ${maskedURI}`);

async function checkFortuneEvents() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB successfully');
    
    // Get the events collection
    const eventsCollection = mongoose.connection.collection('events');
    
    // Count all events
    const totalEvents = await eventsCollection.countDocuments();
    console.log(`Total events in database: ${totalEvents}`);
    
    // Count Fortune Sound Club events
    const fortuneEvents = await eventsCollection.countDocuments({
      "venue.name": "Fortune Sound Club"
    });
    console.log(`Fortune Sound Club events in database: ${fortuneEvents}`);
    
    // Get a sample of Fortune Sound Club events
    const fortuneEventsSample = await eventsCollection
      .find({ "venue.name": "Fortune Sound Club" })
      .limit(5)
      .toArray();
    
    if (fortuneEventsSample.length > 0) {
      console.log('\n✅ Sample Fortune Sound Club events in database:');
      fortuneEventsSample.forEach((event, i) => {
        console.log(`\n--- Event ${i + 1} ---`);
        console.log(`ID: ${event.id || event._id}`);
        console.log(`Title: ${event.title}`);
        console.log(`Date: ${new Date(event.startDate).toLocaleString()}`);
        console.log(`Last Updated: ${new Date(event.lastUpdated).toLocaleString()}`);
      });
      
      // Check for any errors in event format
      console.log('\nChecking event format for potential issues:');
      const formatIssues = fortuneEventsSample.filter(event => {
        const issues = [];
        if (!event.id) issues.push('Missing id');
        if (!event.title) issues.push('Missing title');
        if (!event.startDate) issues.push('Missing startDate');
        if (!event.venue || !event.venue.name) issues.push('Missing venue name');
        if (!event.venue || !event.venue.coordinates) issues.push('Missing venue coordinates');
        if (!event.lastUpdated) issues.push('Missing lastUpdated');
        return issues.length > 0 ? { event: event.title, issues } : null;
      }).filter(Boolean);
      
      if (formatIssues.length > 0) {
        console.log('⚠️ Format issues detected:', formatIssues);
      } else {
        console.log('✅ No format issues detected in sample events');
      }
    } else {
      console.log('❌ No Fortune Sound Club events found in database');
    }
    
    // Count events by venue
    const eventsByVenue = await eventsCollection.aggregate([
      { $group: { _id: "$venue.name", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    console.log('\nEvents by venue:');
    eventsByVenue.forEach(venue => {
      console.log(`${venue._id}: ${venue.count} events`);
    });
    
  } catch (error) {
    console.error('Error checking Fortune events:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

checkFortuneEvents();
