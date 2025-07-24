/**
 * Script to prepare and deploy Toronto events to the cloud MongoDB
 * Following the FINAL_WORKFLOW process
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

// Toronto scrapers
const torontoScrapers = require('./scrapers/cities/Toronto');

// Main function
async function prepareAndDeployTorontoEvents() {
  console.log('🔄 Starting Toronto events preparation and deployment');
  
  try {
    // 1. Fetch events from Toronto scrapers
    console.log('🏙️ Running Toronto scrapers...');
    const events = await torontoScrapers.scrape();
    console.log(`📊 Found ${events.length} events from Toronto venues`);
    
    if (events.length === 0) {
      console.error('❌ No events found from Toronto scrapers');
      return;
    }
    
    // 2. Process events to ensure they match the format required by the app
    console.log('🔧 Formatting events for app compatibility...');
    const formattedEvents = events.map(event => {
      // Make a copy to avoid modifying the original
      const formattedEvent = { ...event };
      
      // Ensure name starts with "Toronto - "
      if (!formattedEvent.name.startsWith('Toronto - ')) {
        formattedEvent.name = `Toronto - ${formattedEvent.name}`;
      }
      
      // Ensure city and cityId are set correctly
      formattedEvent.city = "Toronto";
      formattedEvent.cityId = "Toronto";
      
      // Ensure venue is a string (not an object)
      if (typeof formattedEvent.venue === 'object') {
        // Save original venue name
        const venueName = formattedEvent.venue.name || "Toronto";
        
        // Replace venue object with string
        formattedEvent.venue = "Toronto";
        
        // Store venue data in a venueDetails field to preserve information
        formattedEvent.venueDetails = {
          ...formattedEvent.venue
        };
      }
      
      // Ensure location includes Toronto
      if (!formattedEvent.location) {
        formattedEvent.location = "Toronto, Ontario";
      } else if (!formattedEvent.location.includes('Toronto')) {
        formattedEvent.location = `Toronto, ${formattedEvent.location}`;
      }
      
      // Ensure dates are in the future
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + 30); // 30 days in the future
      
      if (new Date(formattedEvent.startDate) < now) {
        formattedEvent.startDate = futureDate.toISOString();
      }
      
      if (!formattedEvent.endDate || new Date(formattedEvent.endDate) < now) {
        const endDate = new Date(futureDate);
        endDate.setDate(futureDate.getDate() + 2);
        formattedEvent.endDate = endDate.toISOString();
      }
      
      // Add date range
      formattedEvent.dateRange = {
        start: formattedEvent.startDate,
        end: formattedEvent.endDate
      };
      
      // Ensure status is active
      formattedEvent.status = "active";
      
      return formattedEvent;
    });
    
    // Log a sample formatted event
    console.log('\n📝 Sample formatted event:');
    console.log(JSON.stringify({
      name: formattedEvents[0].name,
      city: formattedEvents[0].city,
      venue: formattedEvents[0].venue,
      location: formattedEvents[0].location,
      startDate: formattedEvents[0].startDate,
      status: formattedEvents[0].status
    }, null, 2));
    
    // 3. Connect to cloud MongoDB (from .env file)
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      console.error('❌ Error: MONGODB_URI not found in .env file');
      console.error('Please add your cloud MongoDB URI to .env file:');
      console.error('MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/discovr');
      return;
    }
    
    console.log(`\n🔌 Connecting to cloud MongoDB at: ${uri.substring(0, 20)}...`);
    const client = new MongoClient(uri);
    await client.connect();
    
    // 4. Save formatted events to cloud database
    const database = client.db('discovr');
    const eventsCollection = database.collection('events');
    
    // Save events one by one
    console.log('💾 Saving formatted Toronto events to cloud database...');
    
    let inserted = 0;
    let updated = 0;
    let errors = 0;
    
    for (const event of formattedEvents) {
      try {
        // Check if event already exists
        const existingEvent = await eventsCollection.findOne({
          name: event.name,
          city: "Toronto"
        });
        
        if (existingEvent) {
          // Update existing event
          const result = await eventsCollection.updateOne(
            { _id: existingEvent._id },
            { $set: event }
          );
          
          if (result.modifiedCount > 0) {
            console.log(`✅ Updated: ${event.name}`);
            updated++;
          } else {
            console.log(`ℹ️ No changes needed for: ${event.name}`);
          }
        } else {
          // Insert new event
          const result = await eventsCollection.insertOne(event);
          if (result.acknowledged) {
            console.log(`✅ Inserted: ${event.name}`);
            inserted++;
          }
        }
      } catch (err) {
        console.error(`❌ Error processing event: ${event.name}`, err.message);
        errors++;
      }
    }
    
    // 5. Verify Toronto events in cloud database
    const torontoEvents = await eventsCollection.find({
      city: "Toronto"
    }).toArray();
    
    console.log('\n📊 Deployment Summary:');
    console.log(`📝 Events processed: ${formattedEvents.length}`);
    console.log(`➕ New events inserted: ${inserted}`);
    console.log(`✏️ Events updated: ${updated}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📊 Total Toronto events in cloud database: ${torontoEvents.length}`);
    
    console.log('\n🚀 Next steps:');
    console.log('1. Commit any code changes:');
    console.log('   git add .');
    console.log('   git commit -m "Updated Toronto events"');
    console.log('   git push origin main');
    console.log('2. Deploy on Render:');
    console.log('   Visit dashboard.render.com and click "Manual Deploy"');
    
    // Close the database connection
    await client.close();
    console.log('🔌 Disconnected from cloud MongoDB');
    
  } catch (error) {
    console.error('❌ Error in preparation and deployment process:', error);
  }
}

// Run the function
prepareAndDeployTorontoEvents().catch(console.error);
