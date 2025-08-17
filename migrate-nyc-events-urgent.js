/**
 * URGENT NYC EVENTS MIGRATION - Move 397 NYC events to production database
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = "mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr";

async function migrateNYCEventsUrgent() {
  console.log('🚨 URGENT NYC EVENTS MIGRATION');
  console.log('=' .repeat(50));
  console.log('🎯 Goal: Migrate 397 NYC events from "test" to "discovr" database');
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    // Source: test database (where NYC events are)
    const sourceDb = client.db('test');
    const sourceCollection = sourceDb.collection('events');
    
    // Target: discovr database (where mobile app reads from)
    const targetDb = client.db('discovr');
    const targetCollection = targetDb.collection('events');
    
    console.log('\n📊 PRE-MIGRATION STATUS:');
    console.log('=' .repeat(30));
    
    const sourceTotal = await sourceCollection.countDocuments({});
    const sourceNYC = await sourceCollection.countDocuments({
      $or: [
        { 'venue.city': { $regex: 'new york', $options: 'i' } },
        { city: { $regex: 'new york', $options: 'i' } }
      ]
    });
    
    const targetTotal = await targetCollection.countDocuments({});
    const targetNYC = await targetCollection.countDocuments({
      $or: [
        { 'venue.city': { $regex: 'new york', $options: 'i' } },
        { city: { $regex: 'new york', $options: 'i' } }
      ]
    });
    
    console.log(`📂 Source ("test" database): ${sourceTotal} total, ${sourceNYC} NYC events`);
    console.log(`📂 Target ("discovr" database): ${targetTotal} total, ${targetNYC} NYC events`);
    
    if (sourceNYC === 0) {
      console.log('❌ ERROR: No NYC events found in source database');
      return;
    }
    
    if (targetNYC > 0) {
      console.log(`⚠️ WARNING: Target already has ${targetNYC} NYC events`);
      console.log('🗑️ Removing existing NYC events to prevent duplicates...');
      
      await targetCollection.deleteMany({
        $or: [
          { 'venue.city': { $regex: 'new york', $options: 'i' } },
          { city: { $regex: 'new york', $options: 'i' } }
        ]
      });
      
      console.log('✅ Existing NYC events removed');
    }
    
    // Get all NYC events from source database
    console.log('\n📥 EXTRACTING NYC EVENTS FROM SOURCE...');
    console.log('=' .repeat(40));
    
    const nycEvents = await sourceCollection.find({
      $or: [
        { 'venue.city': { $regex: 'new york', $options: 'i' } },
        { city: { $regex: 'new york', $options: 'i' } }
      ]
    }).toArray();
    
    console.log(`📋 Extracted ${nycEvents.length} NYC events from source database`);
    
    if (nycEvents.length === 0) {
      console.log('❌ No NYC events to migrate');
      return;
    }
    
    // Show sample events being migrated
    console.log('\n📋 Sample NYC events being migrated:');
    nycEvents.slice(0, 5).forEach((event, index) => {
      console.log(`   ${index + 1}. "${event.title}" (${event.venue?.city || event.city || 'No city'})`);
    });
    
    // Insert all NYC events into target database
    console.log('\n📤 MIGRATING NYC EVENTS TO PRODUCTION...');
    console.log('=' .repeat(45));
    
    const insertResult = await targetCollection.insertMany(nycEvents);
    console.log(`✅ Successfully migrated ${insertResult.insertedCount} NYC events`);
    
    // Verify migration
    console.log('\n🧪 VERIFYING MIGRATION SUCCESS...');
    console.log('=' .repeat(35));
    
    const finalTargetTotal = await targetCollection.countDocuments({});
    const finalTargetNYC = await targetCollection.countDocuments({
      $or: [
        { 'venue.city': { $regex: 'new york', $options: 'i' } },
        { city: { $regex: 'new york', $options: 'i' } }
      ]
    });
    
    console.log(`📊 POST-MIGRATION STATUS:`);
    console.log(`   📂 Production database ("discovr"): ${finalTargetTotal} total, ${finalTargetNYC} NYC events`);
    
    if (finalTargetNYC === sourceNYC) {
      console.log('\n🎉 MIGRATION SUCCESSFUL!');
      console.log(`✅ All ${finalTargetNYC} NYC events successfully migrated to production database`);
      console.log('📱 Mobile app should now show NYC events!');
      console.log('🔧 Next: Test API endpoint to confirm NYC events are accessible');
    } else {
      console.log('\n⚠️ MIGRATION INCOMPLETE');
      console.log(`❌ Expected ${sourceNYC} events, but only ${finalTargetNYC} found in target`);
    }
    
    // Test a quick query to verify events are accessible
    console.log('\n🧪 TESTING QUICK NYC QUERY...');
    console.log('=' .repeat(32));
    
    const sampleQuery = await targetCollection.findOne({
      'venue.city': { $regex: 'new york', $options: 'i' }
    });
    
    if (sampleQuery) {
      console.log(`✅ Sample NYC event found: "${sampleQuery.title}"`);
      console.log('🎯 NYC events are now accessible in production database');
    } else {
      console.log('❌ No NYC events found in production database after migration');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await client.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the urgent migration
migrateNYCEventsUrgent();
