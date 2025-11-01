/**
 * CLEAN IMPORT TORONTO - Delete everything and reimport fresh
 */

const mongoose = require('mongoose');

async function cleanAndCount() {
  try {
    await mongoose.connect('mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/discovr?retryWrites=true&w=majority&appName=Discovr');
    console.log('✅ Connected\n');
    
    const db = mongoose.connection.db;
    const collection = db.collection('events');
    
    console.log('🗑️  Deleting ALL Toronto events...');
    const result = await collection.deleteMany({ city: 'Toronto' });
    console.log(`   Deleted: ${result.deletedCount}\n`);
    
    const remaining = await collection.countDocuments({ city: 'Toronto' });
    console.log(`📊 Remaining Toronto events: ${remaining}\n`);
    
    console.log('✅ Database clean! Now run:');
    console.log('   node ImportFiles/import-all-toronto-events.js\n');
    
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanAndCount();
