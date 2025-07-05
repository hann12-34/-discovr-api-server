/**
 * Script to remove all Commodore Ballroom events from the database
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });
const mongoose = require('mongoose');

async function removeCommodoreEvents() {
  // Connect to MongoDB
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in environment variables');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Import Event model
    const Event = require('./models/Event');

    // Find all Commodore Ballroom events
    console.log('🔍 Finding all Commodore Ballroom events...');
    
    // Use multiple criteria to ensure we catch all Commodore Ballroom events
    const query = {
      $or: [
        { 'venue.name': { $regex: /commodore ballroom/i } },
        { dataSources: { $in: ['vancouver-commodore-ballroom'] } },
        { sourceURL: { $regex: /commodoreballroom|livenation.*commodore|ticketmaster.*commodore/i } },
        { title: { $regex: /commodore ballroom/i } }
      ]
    };
    
    const events = await Event.find(query);
    console.log(`✅ Found ${events.length} Commodore Ballroom events`);

    if (events.length > 0) {
      // Delete all found events
      const result = await Event.deleteMany(query);
      console.log(`✅ Deleted ${result.deletedCount} Commodore Ballroom events from database`);
    } else {
      console.log('ℹ️ No Commodore Ballroom events found in database');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

removeCommodoreEvents().catch(console.error);
