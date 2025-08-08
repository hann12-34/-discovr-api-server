require('../../temp-env-config');
const mongoose = require('mongoose');
const Event = require('../../models/Event');

async function removeUncategorizedEvents() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB.');

    console.log(`🔥 Searching for and deleting events with no city tag...`);

    // Events are 'Uncategorized' if 'venue.city' is null, undefined, or doesn't exist.
    const result = await Event.deleteMany({ 'venue.city': { $in: [null, ''] } });

    if (result.deletedCount > 0) {
      console.log(`✅ Successfully deleted ${result.deletedCount} uncategorized events.`);
    } else {
      console.log(`🤷 No uncategorized events found. Nothing to delete.`);
    }

  } catch (error) {
    console.error('❌ Error removing uncategorized events:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB.');
  }
}

removeUncategorizedEvents();
