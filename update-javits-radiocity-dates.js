/**
 * UPDATE JAVITS CENTER & RADIO CITY WITH REAL DATES
 */

const mongoose = require('mongoose');
const javitsScraper = require('./scrapers/cities/New York/javits-center.js');
const radioCityScraper = require('./scrapers/cities/New York/radio-city-music-hall.js');

async function updateEvents() {
  try {
    console.log('🚀 UPDATING JAVITS CENTER & RADIO CITY MUSIC HALL\n');
    console.log('='.repeat(80));
    
    await mongoose.connect('mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/discovr?retryWrites=true&w=majority&appName=Discovr');
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    console.log(`💾 Using database: ${db.databaseName}`);
    const collection = db.collection('events');
    
    // JAVITS CENTER
    console.log('\n🏢 PROCESSING JAVITS CENTER...\n');
    
    const oldJavits = await collection.find({ 'venue.name': /Javits/i }).toArray();
    console.log(`📊 Current Javits events: ${oldJavits.length}`);
    oldJavits.slice(0, 5).forEach((e, i) => {
      const d = new Date(e.startDate || e.date);
      console.log(`   ${i + 1}. ${e.title}: ${d.toDateString()}`);
    });
    
    console.log('\n🗑️  Deleting old Javits events...');
    const deleteJavits = await collection.deleteMany({ 'venue.name': /Javits/i });
    console.log(`✅ Deleted ${deleteJavits.deletedCount} events\n`);
    
    console.log('🔄 Running FIXED Javits scraper...\n');
    const newJavits = await javitsScraper();
    console.log(`\n✅ Scraper returned ${newJavits.length} events\n`);
    
    if (newJavits.length > 0) {
      await collection.insertMany(newJavits);
      console.log(`✅ Saved ${newJavits.length} Javits events with REAL dates`);
    } else {
      console.log('⚠️  No events with real dates found (fake dates removed)');
    }
    
    // RADIO CITY MUSIC HALL
    console.log('\n\n🎭 PROCESSING RADIO CITY MUSIC HALL...\n');
    
    const oldRadio = await collection.find({ 'venue.name': /Radio City/i }).toArray();
    console.log(`📊 Current Radio City events: ${oldRadio.length}`);
    oldRadio.slice(0, 5).forEach((e, i) => {
      const d = new Date(e.startDate || e.date);
      console.log(`   ${i + 1}. ${e.title}: ${d.toDateString()}`);
    });
    
    console.log('\n🗑️  Deleting old Radio City events...');
    const deleteRadio = await collection.deleteMany({ 'venue.name': /Radio City/i });
    console.log(`✅ Deleted ${deleteRadio.deletedCount} events\n`);
    
    console.log('🔄 Running FIXED Radio City scraper...\n');
    const newRadio = await radioCityScraper();
    console.log(`\n✅ Scraper returned ${newRadio.length} events\n`);
    
    if (newRadio.length > 0) {
      await collection.insertMany(newRadio);
      console.log(`✅ Saved ${newRadio.length} Radio City events with REAL dates`);
    } else {
      console.log('⚠️  No events with real dates found (fake dates removed)');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n🎯 SUMMARY:');
    console.log(`   Javits Center: ${oldJavits.length} → ${newJavits.length} events`);
    console.log(`   Radio City: ${oldRadio.length} → ${newRadio.length} events`);
    console.log(`   Total updated: ${newJavits.length + newRadio.length} events ✅`);
    
    // Check for remaining fake "Oct 25" events
    const todayDate = new Date('2025-10-25');
    todayDate.setHours(0, 0, 0, 0);
    const tomorrow = new Date(todayDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const fakeEvents = await collection.find({
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
    
    console.log(`\n📊 REMAINING "OCT 25" EVENTS IN NEW YORK: ${fakeEvents.length}`);
    if (fakeEvents.length > 0) {
      console.log('\nVenues still with fake dates:');
      const venues = {};
      fakeEvents.forEach(e => {
        const venueName = e.venue?.name || e.venue || 'Unknown';
        venues[venueName] = (venues[venueName] || 0) + 1;
      });
      Object.entries(venues).forEach(([venue, count]) => {
        console.log(`   - ${venue}: ${count} events`);
      });
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateEvents();
