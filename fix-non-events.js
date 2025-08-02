const { MongoClient } = require('mongodb');

async function removeNonEvents() {
  try {
    const client = new MongoClient('mongodb://localhost:27017');
    await client.connect();
    const db = client.db('discovr');
    const collection = db.collection('events');
    
    console.log('🗑️ Removing non-events from database...');
    
    // Find and remove non-events
    const nonEventTitles = [
      'Search',
      'search',
      'SEARCH',
      'About the show',
      'ABOUT',
      'About',
      'Enter Keyword',
      'Enter Keyword...',
      'Previous Events',
      'Victoria Event 1',
      'Events and Mee',
      'Events and Meet',
      'Menu',
      'MENU',
      'Header Menu',
      'Navigation',
      'Header',
      'Contact',
      'Home',
      'Events List Navigation'
    ];
    
    let totalRemoved = 0;
    
    for (const title of nonEventTitles) {
      const result = await collection.deleteMany({ title: title });
      if (result.deletedCount > 0) {
        console.log(`✅ Removed ${result.deletedCount} events with title "${title}"`);
        totalRemoved += result.deletedCount;
      }
    }
    
    // Also remove by partial matches
    const partialMatches = [
      /^search$/i,
      /^about/i,
      /^menu$/i,
      /enter keyword/i,
      /previous events/i,
      /victoria event 1/i,
      /events and mee/i,
      /header menu/i,
      /navigation/i
    ];
    
    for (const pattern of partialMatches) {
      const result = await collection.deleteMany({ title: { $regex: pattern } });
      if (result.deletedCount > 0) {
        console.log(`✅ Removed ${result.deletedCount} events matching pattern ${pattern}`);
        totalRemoved += result.deletedCount;
      }
    }
    
    console.log(`\n🎉 TOTAL REMOVED: ${totalRemoved} non-events from database!`);
    
    // Check what's left
    const remaining = await collection.find({
      title: { $regex: /(search|menu|about|navigation|header|keyword|previous|victoria event)/i }
    }).limit(20).toArray();
    
    if (remaining.length > 0) {
      console.log(`\n⚠️ Still found ${remaining.length} suspicious titles:`);
      remaining.forEach(event => {
        console.log(`- "${event.title}" (ID: ${event._id})`);
      });
    } else {
      console.log('\n✅ No suspicious titles found!');
    }
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Database cleanup failed:', error.message);
  }
}

removeNonEvents();
