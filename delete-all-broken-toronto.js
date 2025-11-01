/**
 * DELETE ALL BROKEN TORONTO EVENTS
 */

const mongoose = require('mongoose');

async function deleteAllBrokenToronto() {
  try {
    console.log('🗑️  DELETING ALL BROKEN TORONTO EVENTS\n');
    console.log('='.repeat(80));
    
    await mongoose.connect('mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/discovr?retryWrites=true&w=majority&appName=Discovr');
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    const collection = db.collection('events');
    
    const totalBefore = await collection.countDocuments({ city: 'Toronto' });
    console.log(`📊 Toronto events BEFORE: ${totalBefore}\n`);
    
    // Delete ALL Toronto events (they're all broken)
    const result = await collection.deleteMany({ city: 'Toronto' });
    
    console.log(`🗑️  Deleted: ${result.deletedCount} events\n`);
    
    const totalAfter = await collection.countDocuments({ city: 'Toronto' });
    console.log(`📊 Toronto events AFTER: ${totalAfter}\n`);
    
    console.log('='.repeat(80));
    console.log('\n✅ All broken Toronto events deleted!');
    console.log('📝 Next: Fix Scotiabank Arena scraper to parse dates correctly');
    
    await mongoose.connection.close();
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deleteAllBrokenToronto();
