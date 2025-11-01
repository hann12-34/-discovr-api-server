/**
 * CLEAN SOBs & PIER 17 FAKE DATE EVENTS
 */

const mongoose = require('mongoose');

async function cleanDatabase() {
  try {
    console.log('🧹 CLEANING SOBs & PIER 17 FAKE DATE EVENTS\n');
    console.log('='.repeat(80));
    
    await mongoose.connect('mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/discovr?retryWrites=true&w=majority&appName=Discovr');
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    console.log(`💾 Using database: ${db.databaseName}\n`);
    const collection = db.collection('events');
    
    // SOBs
    console.log('🇧🇷 Checking SOBs...');
    const sobsCount = await collection.countDocuments({ 
      $or: [
        { 'venue.name': /SOBs/i },
        { venue: /SOBs/i },
        { source: 'sobs' }
      ]
    });
    console.log(`   Found ${sobsCount} events`);
    
    if (sobsCount > 0) {
      const sobsResult = await collection.deleteMany({
        $or: [
          { 'venue.name': /SOBs/i },
          { venue: /SOBs/i },
          { source: 'sobs' }
        ]
      });
      console.log(`   ✅ Deleted ${sobsResult.deletedCount} SOBs events\n`);
    }
    
    // Pier 17
    console.log('🌊 Checking Pier 17...');
    const pier17Count = await collection.countDocuments({ 
      $or: [
        { 'venue.name': /Pier 17/i },
        { venue: /Pier 17/i },
        { source: 'pier-17' }
      ]
    });
    console.log(`   Found ${pier17Count} events`);
    
    if (pier17Count > 0) {
      const pier17Result = await collection.deleteMany({
        $or: [
          { 'venue.name': /Pier 17/i },
          { venue: /Pier 17/i },
          { source: 'pier-17' }
        ]
      });
      console.log(`   ✅ Deleted ${pier17Result.deletedCount} Pier 17 events\n`);
    }
    
    console.log('='.repeat(80));
    console.log(`\n🎯 TOTAL DELETED: ${sobsCount + pier17Count} events\n`);
    
    // Check remaining "Oct 25" events
    const todayDate = new Date('2025-10-25');
    todayDate.setHours(0, 0, 0, 0);
    const tomorrow = new Date(todayDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const remainingFake = await collection.find({
      $and: [
        { city: 'New York' },
        {
          $or: [
            { date: { $gte: todayDate, $lt: tomorrow } },
            { startDate: { $gte: todayDate, $lt: tomorrow } }
          ]
        }
      ]
    }).toArray();
    
    console.log(`📊 REMAINING "OCT 25" EVENTS IN NEW YORK: ${remainingFake.length}`);
    
    if (remainingFake.length > 0) {
      console.log('\n⚠️  Venues still with fake Oct 25 dates:');
      const venues = {};
      remainingFake.forEach(e => {
        const venueName = e.venue?.name || e.venue || 'Unknown';
        venues[venueName] = (venues[venueName] || 0) + 1;
      });
      Object.entries(venues).sort((a, b) => b[1] - a[1]).forEach(([venue, count]) => {
        console.log(`   - ${venue}: ${count} events`);
      });
    } else {
      console.log('\n🎉 SUCCESS! NO MORE FAKE "OCT 25" EVENTS!');
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanDatabase();
