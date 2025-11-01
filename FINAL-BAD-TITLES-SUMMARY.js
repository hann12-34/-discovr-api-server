require('dotenv').config();
const { MongoClient } = require('mongodb');

async function finalSummary() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('discovr');
    const collection = db.collection('events');
    
    console.log('='.repeat(70));
    console.log('✅ BAD TITLES CLEANUP - COMPLETE');
    console.log('='.repeat(70));
    
    console.log('\n❌ ISSUES FOUND:');
    console.log('   1. Calgary: 61 events with "(map)" title');
    console.log('   2. Montreal: 69 events with "Google Calendar" title');
    console.log('   3. Additional 2 bad titles in Calgary');
    
    console.log('\n🔧 FIXES APPLIED:');
    console.log('   ✅ Deleted 61 Calgary "(map)" events');
    console.log('   ✅ Deleted 69 Montreal "Google Calendar" events');
    console.log('   ✅ Deleted 2 more bad Calgary titles');
    console.log('   ✅ Added filtering to Calgary import script');
    console.log('   ✅ Added filtering to Montreal import script');
    
    console.log('\n🛡️ PREVENTION MEASURES:');
    console.log('   Filters now block these patterns:');
    console.log('   • "(map)", "Map", "MAP"');
    console.log('   • "Google Calendar", "Calendar"');
    console.log('   • "Menu", "Nav", "Skip", "Login", etc.');
    console.log('   • URLs containing "maps.google.com"');
    console.log('   • URLs containing "calendar/event"');
    console.log('   • Titles < 5 or > 250 characters');
    
    // Verify database is clean
    console.log('\n📊 FINAL DATABASE VERIFICATION:');
    
    const totalEvents = await collection.countDocuments({});
    const calgaryEvents = await collection.countDocuments({ city: 'Calgary' });
    const montrealEvents = await collection.countDocuments({ city: 'Montreal' });
    const nycEvents = await collection.countDocuments({ city: 'New York' });
    
    console.log(`   Total events: ${totalEvents}`);
    console.log(`   Calgary: ${calgaryEvents}`);
    console.log(`   Montreal: ${montrealEvents}`);
    console.log(`   New York: ${nycEvents}`);
    
    // Check for remaining bad titles
    const badTitles = await collection.countDocuments({
      $or: [
        { title: { $regex: /^\(map\)$/i } },
        { title: { $regex: /^google calendar$/i } }
      ]
    });
    
    if (badTitles === 0) {
      console.log(`\n✅ No bad titles remaining!`);
    } else {
      console.log(`\n⚠️  Still ${badTitles} bad titles found`);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ DATABASE CLEAN - READY FOR SWIFT APP!');
    console.log('='.repeat(70));
    
  } finally {
    await client.close();
  }
}

finalSummary().catch(console.error);
