/**
 * Remove "Vancouver - " prefix from event titles for cleaner mobile app display
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

async function fixVancouverTitlePrefix() {
  console.log('🔧 REMOVING VANCOUVER PREFIX FROM EVENT TITLES');
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
    
    // Find events with "Vancouver - " prefix in title
    console.log('\n🔍 Finding events with "Vancouver - " prefix...');
    
    const eventsWithVancouverPrefix = await collection.find({
      $or: [
        { title: { $regex: '^Vancouver - ', $options: 'i' } },
        { name: { $regex: '^Vancouver - ', $options: 'i' } }
      ]
    }).toArray();
    
    console.log(`📊 Found ${eventsWithVancouverPrefix.length} events with Vancouver prefix`);
    
    if (eventsWithVancouverPrefix.length === 0) {
      console.log('✅ No events with Vancouver prefix found!');
      return;
    }
    
    // Show samples
    console.log('\n📋 Sample events with Vancouver prefix:');
    eventsWithVancouverPrefix.slice(0, 10).forEach((event, index) => {
      console.log(`   ${index + 1}. "${event.title || event.name}"`);
    });
    
    // Fix each event
    console.log('\n🔧 Removing Vancouver prefix from titles...');
    let fixedCount = 0;
    
    for (const event of eventsWithVancouverPrefix) {
      const updates = {};
      
      // Fix title field
      if (event.title && event.title.toLowerCase().startsWith('vancouver - ')) {
        const cleanTitle = event.title.replace(/^Vancouver\s*-\s*/i, '');
        updates.title = cleanTitle;
      }
      
      // Fix name field
      if (event.name && event.name.toLowerCase().startsWith('vancouver - ')) {
        const cleanName = event.name.replace(/^Vancouver\s*-\s*/i, '');
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
    
    console.log(`\n✅ Cleaned ${fixedCount} Vancouver event titles`);
    
    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    
    const remainingVancouverPrefix = await collection.find({
      $or: [
        { title: { $regex: '^Vancouver - ', $options: 'i' } },
        { name: { $regex: '^Vancouver - ', $options: 'i' } }
      ]
    }).toArray();
    
    console.log(`📊 Remaining events with Vancouver prefix: ${remainingVancouverPrefix.length}`);
    
    if (remainingVancouverPrefix.length === 0) {
      console.log('🎉 ALL VANCOUVER PREFIXES REMOVED!');
      console.log('📱 Event titles should now be cleaner in the mobile app.');
    } else {
      console.log('⚠️ Some Vancouver prefixes remain');
      remainingVancouverPrefix.slice(0, 5).forEach((event, index) => {
        console.log(`   ${index + 1}. "${event.title || event.name}"`);
      });
    }
    
    // Show sample of cleaned titles
    console.log('\n📋 Sample of cleaned Vancouver event titles:');
    const vancouverEvents = await collection.find({
      $or: [
        { location: { $regex: 'Vancouver', $options: 'i' } },
        { 'venue.city': { $regex: 'Vancouver', $options: 'i' } }
      ]
    }).limit(10).toArray();
    
    vancouverEvents.forEach((event, index) => {
      console.log(`   ${index + 1}. "${event.title || event.name}"`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing Vancouver title prefix:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixVancouverTitlePrefix().catch(console.error);
