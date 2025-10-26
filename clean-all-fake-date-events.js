/**
 * CLEAN ALL EVENTS WITH FAKE DATES FROM DATABASE
 */

const mongoose = require('mongoose');

const venuesWithFakeDates = [
  'Comedy Cellar',
  'Apollo Theater',
  'Carnegie Hall',
  'Brooklyn Academy of Music',
  'Brooklyn Mirage',
  'Music Hall of Williamsburg',
  'Terminal 5',
  'Mercury Lounge',
  'Highline Ballroom',
  'Yankee Stadium',
  'Citi Field',
  'Forest Hills Stadium',
  'Prudential Center',
  'Moynihan Train Hall'
];

async function cleanDatabase() {
  try {
    console.log('🧹 CLEANING ALL EVENTS WITH FAKE DATES\n');
    console.log('='.repeat(80));
    
    await mongoose.connect('mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/discovr?retryWrites=true&w=majority&appName=Discovr');
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    console.log(`💾 Using database: ${db.databaseName}\n`);
    const collection = db.collection('events');
    
    let totalDeleted = 0;
    
    for (const venueName of venuesWithFakeDates) {
      console.log(`🔍 Checking: ${venueName}`);
      
      const count = await collection.countDocuments({ 
        $or: [
          { 'venue.name': new RegExp(venueName, 'i') },
          { venue: new RegExp(venueName, 'i') }
        ]
      });
      
      if (count > 0) {
        console.log(`   Found ${count} events`);
        
        const result = await collection.deleteMany({
          $or: [
            { 'venue.name': new RegExp(venueName, 'i') },
            { venue: new RegExp(venueName, 'i') }
          ]
        });
        
        console.log(`   ✅ Deleted ${result.deletedCount} events\n`);
        totalDeleted += result.deletedCount;
      } else {
        console.log(`   No events found\n`);
      }
    }
    
    console.log('='.repeat(80));
    console.log(`\n🎯 TOTAL DELETED: ${totalDeleted} events with fake dates\n`);
    
    // Check remaining "Oct 25" events in New York
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
      console.log('\n⚠️  Venues still with fake dates:');
      const venues = {};
      remainingFake.forEach(e => {
        const venueName = e.venue?.name || e.venue || 'Unknown';
        venues[venueName] = (venues[venueName] || 0) + 1;
      });
      Object.entries(venues).sort((a, b) => b[1] - a[1]).forEach(([venue, count]) => {
        console.log(`   - ${venue}: ${count} events`);
      });
    } else {
      console.log('\n🎉 SUCCESS! NO MORE FAKE "OCT 25" EVENTS IN NEW YORK!');
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanDatabase();
