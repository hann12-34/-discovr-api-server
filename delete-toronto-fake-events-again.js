/**
 * DELETE TORONTO FAKE EVENTS AGAIN (Keep deleting until deployment happens)
 */

const mongoose = require('mongoose');

async function deleteFakeEvents() {
  try {
    await mongoose.connect('mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/discovr?retryWrites=true&w=majority&appName=Discovr');
    console.log('✅ Connected\n');
    
    const db = mongoose.connection.db;
    const collection = db.collection('events');
    
    // Delete ALL Toronto events (they keep getting recreated by old code on Render)
    const result = await collection.deleteMany({ city: 'Toronto' });
    console.log(`🗑️  Deleted ${result.deletedCount} Toronto events\n`);
    
    const remaining = await collection.countDocuments({ city: 'Toronto' });
    console.log(`📊 Remaining: ${remaining}\n`);
    
    if (remaining === 0) {
      console.log('✅ All Toronto fake events deleted!');
      console.log('⚠️  They will come back until Render deploys the fixed code\n');
    }
    
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deleteFakeEvents();
