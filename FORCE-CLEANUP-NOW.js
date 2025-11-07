#!/usr/bin/env node
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://seongwoohan:rnsdn200509@cluster0.uuukc.mongodb.net/discovr-db?retryWrites=true&w=majority';

(async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!');
    
    const Event = mongoose.model('Event', new mongoose.Schema({}, { strict: false, collection: 'events' }));
    
    console.log('🔍 Finding events without id field...');
    const missingId = await Event.find({ id: { $exists: false } }).limit(5).lean();
    console.log(`Found ${missingId.length} sample events without id:`);
    missingId.forEach((e, i) => {
      console.log(`  ${i+1}. "${e.title}" (${e.city || 'NO_CITY'})`);
    });
    
    const totalMissing = await Event.countDocuments({ id: { $exists: false } });
    console.log(`\n❌ Total events without id: ${totalMissing}`);
    
    if (totalMissing > 0) {
      console.log('\n🔥 DELETING ALL EVENTS WITHOUT ID...');
      const result = await Event.deleteMany({ id: { $exists: false } });
      console.log(`✅ DELETED: ${result.deletedCount} events`);
      
      const remaining = await Event.countDocuments({});
      console.log(`📊 Database now has ${remaining} events`);
      console.log('\n✅✅✅ CLEANUP COMPLETE!');
    } else {
      console.log('\n✅ All events already have id field!');
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
