require('../../temp-env-config');
const mongoose = require('mongoose');
const Event = require('../../models/Event');

async function removeSanFranciscoEvents() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB.');

    const cityToRemove = 'San Francisco';

    console.log(`🔥 Searching for and deleting events from "${cityToRemove}"...`);

    const result = await Event.deleteMany({ 'venue.city': cityToRemove });

    if (result.deletedCount > 0) {
      console.log(`✅ Successfully deleted ${result.deletedCount} events from "${cityToRemove}".`);
    } else {
      console.log(`🤷 No events found from "${cityToRemove}". Nothing to delete.`);
    }

  } catch (error) {
    console.error('❌ Error removing San Francisco events:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB.');
  }
}

removeSanFranciscoEvents();
