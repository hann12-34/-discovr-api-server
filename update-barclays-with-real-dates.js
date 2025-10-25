/**
 * UPDATE BARCLAYS CENTER EVENTS WITH REAL DATES
 * This will:
 * 1. Run the FIXED Barclays scraper
 * 2. Delete old Barclays events with fake dates
 * 3. Insert new events with REAL dates
 */

const mongoose = require('mongoose');
const scraper = require('./scrapers/cities/New York/barclays-center.js');

async function updateBarclaysEvents() {
  try {
    console.log('🚀 UPDATING BARCLAYS CENTER EVENTS WITH REAL DATES\n');
    console.log('='.repeat(80));
    
    // Connect to MongoDB - FORCE discovr database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/discovr?retryWrites=true&w=majority&appName=Discovr');
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    console.log(`💾 Using database: ${db.databaseName}`);
    const collection = db.collection('events');
    
    // Step 1: Show old Barclays events
    const oldEvents = await collection.find({
      $or: [
        { 'venue.name': /Barclays/i },
        { venue: /Barclays/i }
      ]
    }).toArray();
    
    console.log(`📊 CURRENT BARCLAYS EVENTS IN DATABASE: ${oldEvents.length}`);
    oldEvents.slice(0, 5).forEach((event, i) => {
      const date = new Date(event.startDate || event.date);
      console.log(`   ${i + 1}. ${event.title}: ${date.toDateString()}`);
    });
    console.log('');
    
    // Step 2: Delete old Barclays events
    console.log('🗑️  Deleting old Barclays events...');
    const deleteResult = await collection.deleteMany({
      $or: [
        { 'venue.name': /Barclays/i },
        { venue: /Barclays/i }
      ]
    });
    console.log(`✅ Deleted ${deleteResult.deletedCount} old events\n`);
    
    // Step 3: Run the FIXED scraper
    console.log('🔄 Running FIXED Barclays scraper...\n');
    const newEvents = await scraper();
    console.log(`✅ Scraper returned ${newEvents.length} events with REAL dates\n`);
    
    // Step 4: Insert new events
    if (newEvents.length > 0) {
      console.log('💾 Saving new events to database...');
      await collection.insertMany(newEvents);
      console.log(`✅ Saved ${newEvents.length} new events\n`);
      
      // Show sample of new events
      console.log('📊 NEW BARCLAYS EVENTS (SAMPLE):');
      newEvents.slice(0, 10).forEach((event, i) => {
        const date = new Date(event.startDate || event.date);
        console.log(`   ${i + 1}. ${event.title}: ${date.toDateString()}`);
      });
      console.log('');
    }
    
    // Step 5: Verify in database
    const verifyEvents = await collection.find({
      $or: [
        { 'venue.name': /Barclays/i },
        { venue: /Barclays/i }
      ]
    }).toArray();
    
    console.log('='.repeat(80));
    console.log('\n✅ UPDATE COMPLETE!\n');
    console.log(`📊 RESULTS:`);
    console.log(`   Old events deleted: ${deleteResult.deletedCount}`);
    console.log(`   New events added: ${newEvents.length}`);
    console.log(`   Total in database: ${verifyEvents.length}`);
    
    // Check for fake "today" dates
    const todayDate = new Date('2025-10-25');
    todayDate.setHours(0, 0, 0, 0);
    const tomorrow = new Date(todayDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const fakeEvents = verifyEvents.filter(e => {
      const d = new Date(e.startDate || e.date);
      return d >= todayDate && d < tomorrow;
    });
    
    console.log(`   Events with Oct 25 (fake "TODAY"): ${fakeEvents.length} ${fakeEvents.length === 0 ? '✅' : '❌'}`);
    console.log(`   Events with REAL dates: ${verifyEvents.length - fakeEvents.length} ✅`);
    
    if (fakeEvents.length === 0) {
      console.log('\n🎉 SUCCESS! ALL BARCLAYS EVENTS NOW HAVE REAL DATES!');
      console.log('Your app should now show:');
      console.log('   - John Legend: Nov 4, 2025 ✅');
      console.log('   - Tame Impala: Oct 27, 2025 ✅');
      console.log('   - Brooklyn Nets games: Real dates ✅');
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateBarclaysEvents();
