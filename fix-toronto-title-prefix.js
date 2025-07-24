/**
 * Remove "Toronto - " prefix from event titles for cleaner mobile app display
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

async function fixTorontoTitlePrefix() {
  console.log('🔧 REMOVING TORONTO PREFIX FROM EVENT TITLES');
  console.log('=' .repeat(60));
  
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    return;
  }

  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const collection = db.collection('events');
    
    // Find events with "Toronto - " prefix in title
    console.log('\n🔍 Finding events with "Toronto - " prefix...');
    
    const eventsWithTorontoPrefix = await collection.find({
      $or: [
        { title: { $regex: '^Toronto - ', $options: 'i' } },
        { name: { $regex: '^Toronto - ', $options: 'i' } }
      ]
    }).toArray();
    
    console.log(`📊 Found ${eventsWithTorontoPrefix.length} events with Toronto prefix`);
    
    if (eventsWithTorontoPrefix.length === 0) {
      console.log('✅ No events with Toronto prefix found!');
      return;
    }
    
    // Show samples
    console.log('\n📋 Sample events with Toronto prefix:');
    eventsWithTorontoPrefix.slice(0, 10).forEach((event, index) => {
      console.log(`   ${index + 1}. "${event.title || event.name}"`);
    });
    
    // Fix each event
    console.log('\n🔧 Removing Toronto prefix from titles...');
    let fixedCount = 0;
    
    for (const event of eventsWithTorontoPrefix) {
      const updates = {};
      
      // Fix title field
      if (event.title && event.title.toLowerCase().startsWith('toronto - ')) {
        const cleanTitle = event.title.replace(/^Toronto - /i, '');
        updates.title = cleanTitle;
      }
      
      // Fix name field
      if (event.name && event.name.toLowerCase().startsWith('toronto - ')) {
        const cleanName = event.name.replace(/^Toronto - /i, '');
        updates.name = cleanName;
      }
      
      // Update the event if there are changes
      if (Object.keys(updates).length > 0) {
        await collection.updateOne(
          { _id: event._id },
          { $set: updates }
        );
        
        fixedCount++;
        
        if (fixedCount <= 15) {
          console.log(`   ✅ Fixed: "${event.title || event.name}"`);
          if (updates.title) {
            console.log(`      Title: "${event.title}" → "${updates.title}"`);
          }
          if (updates.name) {
            console.log(`      Name: "${event.name}" → "${updates.name}"`);
          }
        }
      }
    }
    
    console.log(`\n✅ Cleaned ${fixedCount} event titles`);
    
    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    
    const remainingTorontoPrefix = await collection.find({
      $or: [
        { title: { $regex: '^Toronto - ', $options: 'i' } },
        { name: { $regex: '^Toronto - ', $options: 'i' } }
      ]
    }).toArray();
    
    console.log(`📊 Remaining events with Toronto prefix: ${remainingTorontoPrefix.length}`);
    
    if (remainingTorontoPrefix.length === 0) {
      console.log('🎉 ALL TORONTO PREFIXES REMOVED!');
      console.log('📱 Event titles should now be cleaner in the mobile app.');
    } else {
      console.log('⚠️ Some Toronto prefixes remain');
      remainingTorontoPrefix.slice(0, 5).forEach((event, index) => {
        console.log(`   ${index + 1}. "${event.title || event.name}"`);
      });
    }
    
    // Show sample of cleaned titles
    console.log('\n📋 Sample of cleaned Toronto event titles:');
    const torontoEvents = await collection.find({
      $or: [
        { location: { $regex: 'Toronto', $options: 'i' } },
        { 'venue.city': { $regex: 'Toronto', $options: 'i' } }
      ]
    }).limit(10).toArray();
    
    torontoEvents.forEach((event, index) => {
      console.log(`   ${index + 1}. "${event.title || event.name}"`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing Toronto title prefix:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixTorontoTitlePrefix().catch(console.error);
