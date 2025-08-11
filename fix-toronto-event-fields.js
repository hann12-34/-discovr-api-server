/**
 * EMERGENCY FIX: TORONTO EVENT FIELDS
 * 
 * Repairs broken Toronto events with undefined titles/sources
 * All 901 events have proper city tags but missing critical fields
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://discov...";

async function fixBrokenTorontoEvents() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('🔧 EMERGENCY FIX: TORONTO EVENT FIELDS');
    console.log('='.repeat(60));
    
    const eventsCollection = client.db('events').collection('events');
    
    // Get all Toronto events with undefined titles
    const brokenEvents = await eventsCollection.find({
      $and: [
        { 'venue.city': 'Toronto' },
        {
          $or: [
            { title: { $exists: false } },
            { title: null },
            { title: undefined },
            { title: '' }
          ]
        }
      ]
    }).toArray();
    
    console.log(`🔍 Found ${brokenEvents.length} Toronto events with missing/undefined titles`);
    
    if (brokenEvents.length === 0) {
      console.log('✅ No broken events found! All Toronto events have valid titles.');
      return;
    }
    
    let fixed = 0;
    let failed = 0;
    
    console.log('\n🔧 Fixing broken events...');
    
    for (const event of brokenEvents) {
      try {
        // Generate meaningful title and source from available data
        let fixedTitle = 'Toronto Event';
        let fixedSource = 'Toronto Venue';
        let fixedDescription = 'Experience this event in Toronto.';
        
        // Try to extract meaningful info from venue or other fields
        if (event.venue?.name) {
          fixedTitle = `Event at ${event.venue.name}`;
          fixedSource = `${event.venue.name}-Toronto`;
        }
        
        // Use tags to improve title
        if (event.tags && event.tags.length > 0) {
          const relevantTags = event.tags.filter(tag => 
            !['toronto', 'ontario', 'canada'].includes(tag.toLowerCase())
          );
          if (relevantTags.length > 0) {
            const tagStr = relevantTags.slice(0, 2).join(' & ');
            fixedTitle = `${tagStr.charAt(0).toUpperCase() + tagStr.slice(1)} Event`;
          }
        }
        
        // Use date info if available
        if (event.startDate) {
          const eventDate = new Date(event.startDate);
          if (!isNaN(eventDate.getTime())) {
            fixedTitle += ` - ${eventDate.toLocaleDateString()}`;
          }
        }
        
        // Generate description from available info
        const venue = event.venue?.name || 'a venue';
        const location = event.venue?.address || 'Toronto, ON';
        fixedDescription = `Experience ${fixedTitle.toLowerCase()} at ${venue} in ${location}.`;
        
        // Update the event with fixed fields
        const updateResult = await eventsCollection.updateOne(
          { _id: event._id },
          {
            $set: {
              title: fixedTitle,
              source: fixedSource,
              description: fixedDescription,
              updatedAt: new Date()
            }
          }
        );
        
        if (updateResult.modifiedCount > 0) {
          fixed++;
          console.log(`✅ Fixed: "${fixedTitle}"`);
        } else {
          failed++;
          console.log(`❌ Failed to fix event: ${event._id}`);
        }
        
      } catch (error) {
        failed++;
        console.error(`❌ Error fixing event ${event._id}:`, error.message);
      }
    }
    
    console.log('\n📊 FIX RESULTS:');
    console.log(`✅ Successfully fixed: ${fixed}`);
    console.log(`❌ Failed to fix: ${failed}`);
    console.log(`📈 Success rate: ${Math.round((fixed/(fixed+failed))*100)}%`);
    
    // Verify the fix
    console.log('\n🔍 VERIFICATION:');
    const validEvents = await eventsCollection.countDocuments({
      $and: [
        { 'venue.city': 'Toronto' },
        { title: { $exists: true, $ne: null, $ne: undefined, $ne: '' } },
        { source: { $exists: true, $ne: null, $ne: undefined, $ne: '' } }
      ]
    });
    
    console.log(`✅ Toronto events with valid titles and sources: ${validEvents}`);
    
    if (validEvents > 800) {
      console.log('🎉 SUCCESS! Most Toronto events now have valid data!');
      console.log('📱 Mobile app should now show many more Toronto events!');
    } else if (validEvents > 100) {
      console.log('⚡ GOOD PROGRESS! Many events fixed, but some may need additional work');
    } else {
      console.log('⚠️ LIMITED SUCCESS! May need different fix approach');
    }
    
  } catch (error) {
    console.error('❌ Fix process failed:', error);
  } finally {
    await client.close();
  }
}

// Run the fix
fixBrokenTorontoEvents().catch(console.error);
