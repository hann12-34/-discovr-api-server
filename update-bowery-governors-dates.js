/**
 * UPDATE BOWERY BALLROOM & GOVERNORS BALL WITH REAL DATES
 */

const mongoose = require('mongoose');
const boweryScraper = require('./scrapers/cities/New York/bowery-ballroom.js');
const governorsScraper = require('./scrapers/cities/New York/governors-ball.js');

async function updateEvents() {
  try {
    console.log('🚀 UPDATING BOWERY BALLROOM & GOVERNORS BALL EVENTS\n');
    console.log('='.repeat(80));
    
    // Connect to MongoDB discovr database
    await mongoose.connect('mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/discovr?retryWrites=true&w=majority&appName=Discovr');
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    console.log(`💾 Using database: ${db.databaseName}`);
    const collection = db.collection('events');
    
    // BOWERY BALLROOM
    console.log('\n🎸 PROCESSING BOWERY BALLROOM...\n');
    
    const oldBowery = await collection.find({ 'venue.name': /Bowery Ballroom/i }).toArray();
    console.log(`📊 Current Bowery events: ${oldBowery.length}`);
    oldBowery.slice(0, 3).forEach((e, i) => {
      const d = new Date(e.startDate || e.date);
      console.log(`   ${i + 1}. ${e.title}: ${d.toDateString()}`);
    });
    
    console.log('\n🗑️  Deleting old Bowery events...');
    const deleteBowery = await collection.deleteMany({ 'venue.name': /Bowery Ballroom/i });
    console.log(`✅ Deleted ${deleteBowery.deletedCount} events\n`);
    
    console.log('🔄 Running FIXED Bowery scraper...\n');
    const newBowery = await boweryScraper();
    console.log(`\n✅ Scraper returned ${newBowery.length} events with REAL dates\n`);
    
    if (newBowery.length > 0) {
      await collection.insertMany(newBowery);
      console.log(`✅ Saved ${newBowery.length} Bowery events`);
      newBowery.slice(0, 5).forEach((e, i) => {
        const d = new Date(e.startDate || e.date);
        console.log(`   ${i + 1}. ${e.title}: ${d.toDateString()}`);
      });
    }
    
    // GOVERNORS BALL
    console.log('\n\n🎪 PROCESSING GOVERNORS BALL...\n');
    
    const oldGov = await collection.find({ 'venue.name': /Governors Ball/i }).toArray();
    console.log(`📊 Current Governors Ball events: ${oldGov.length}`);
    oldGov.slice(0, 3).forEach((e, i) => {
      const d = new Date(e.startDate || e.date);
      console.log(`   ${i + 1}. ${e.title}: ${d.toDateString()}`);
    });
    
    console.log('\n🗑️  Deleting old Governors Ball events...');
    const deleteGov = await collection.deleteMany({ 'venue.name': /Governors Ball/i });
    console.log(`✅ Deleted ${deleteGov.deletedCount} events\n`);
    
    console.log('🔄 Running FIXED Governors Ball scraper...\n');
    const newGov = await governorsScraper();
    console.log(`\n✅ Scraper returned ${newGov.length} events\n`);
    
    if (newGov.length > 0) {
      await collection.insertMany(newGov);
      console.log(`✅ Saved ${newGov.length} Governors Ball events`);
    } else {
      console.log('⚠️  No events with real dates found (hardcoded fake dates removed)');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n🎯 SUMMARY:');
    console.log(`   Bowery Ballroom: ${oldBowery.length} → ${newBowery.length} events`);
    console.log(`   Governors Ball: ${oldGov.length} → ${newGov.length} events`);
    console.log(`   Total updated: ${newBowery.length + newGov.length} events with REAL dates ✅`);
    
    await mongoose.connection.close();
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateEvents();
