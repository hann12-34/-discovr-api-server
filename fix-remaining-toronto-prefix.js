/**
 * Fix the remaining Toronto prefixes
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

async function fixRemainingTorontoPrefix() {
  console.log('🔧 FIXING REMAINING TORONTO PREFIXES');
  console.log('=' .repeat(50));
  
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
    
    // Find remaining events with Toronto prefix
    const remainingEvents = await collection.find({
      $or: [
        { title: { $regex: '^Toronto - ', $options: 'i' } },
        { name: { $regex: '^Toronto - ', $options: 'i' } }
      ]
    }).toArray();
    
    console.log(`📊 Found ${remainingEvents.length} remaining events with Toronto prefix`);
    
    if (remainingEvents.length === 0) {
      console.log('✅ No remaining Toronto prefixes!');
      return;
    }
    
    console.log('\n📋 Remaining events:');
    remainingEvents.forEach((event, index) => {
      console.log(`   ${index + 1}. Title: "${event.title || 'N/A'}"`);
      console.log(`      Name: "${event.name || 'N/A'}"`);
      console.log(`      ID: ${event.id || event._id}`);
      console.log('');
    });
    
    // Fix each remaining event
    console.log('🔧 Fixing remaining events...');
    
    for (const event of remainingEvents) {
      const updates = {};
      
      // Fix title field - be more aggressive with regex
      if (event.title) {
        const cleanTitle = event.title.replace(/^Toronto\s*-\s*/i, '');
        if (cleanTitle !== event.title) {
          updates.title = cleanTitle;
        }
      }
      
      // Fix name field - be more aggressive with regex
      if (event.name) {
        const cleanName = event.name.replace(/^Toronto\s*-\s*/i, '');
        if (cleanName !== event.name) {
          updates.name = cleanName;
        }
      }
      
      // Update the event if there are changes
      if (Object.keys(updates).length > 0) {
        await collection.updateOne(
          { _id: event._id },
          { $set: updates }
        );
        
        console.log(`   ✅ Fixed: ${event.id || event._id}`);
        if (updates.title) {
          console.log(`      Title: "${event.title}" → "${updates.title}"`);
        }
        if (updates.name) {
          console.log(`      Name: "${event.name}" → "${updates.name}"`);
        }
      }
    }
    
    // Final verification
    console.log('\n🔍 Final verification...');
    const finalCheck = await collection.find({
      $or: [
        { title: { $regex: '^Toronto - ', $options: 'i' } },
        { name: { $regex: '^Toronto - ', $options: 'i' } }
      ]
    }).toArray();
    
    console.log(`📊 Events still with Toronto prefix: ${finalCheck.length}`);
    
    if (finalCheck.length === 0) {
      console.log('🎉 ALL TORONTO PREFIXES REMOVED!');
      console.log('📱 Mobile app will now show clean event titles.');
    } else {
      console.log('⚠️ Some prefixes still remain:');
      finalCheck.forEach((event, index) => {
        console.log(`   ${index + 1}. "${event.title || event.name}"`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error fixing remaining Toronto prefixes:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixRemainingTorontoPrefix().catch(console.error);
