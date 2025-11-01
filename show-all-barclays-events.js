/**
 * SHOW ALL BARCLAYS EVENTS
 */

const scraper = require('./scrapers/cities/New York/barclays-center.js');

async function showAll() {
  console.log('🎯 ALL BARCLAYS CENTER EVENTS:\n');
  console.log('='.repeat(80));
  
  try {
    const events = await scraper();
    
    console.log(`\n✅ TOTAL: ${events.length} EVENTS WITH REAL DATES\n`);
    
    events.forEach((event, i) => {
      const dateObj = new Date(event.startDate || event.date);
      const isToday = dateObj.toDateString() === new Date().toDateString();
      const isFake = dateObj.toDateString() === new Date('2025-10-25').toDateString();
      
      console.log(`${i + 1}. ${event.title}`);
      console.log(`   📅 Date: ${dateObj.toDateString()}`);
      console.log(`   📍 Category: ${event.category}`);
      if (isToday || isFake) {
        console.log(`   ⚠️  WARNING: Shows as TODAY (Oct 25)`);
      }
      console.log('');
    });
    
    // Check for fake dates
    const todayEvents = events.filter(e => {
      const d = new Date(e.startDate || e.date);
      return d.toDateString() === new Date('2025-10-25').toDateString();
    });
    
    console.log('='.repeat(80));
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total events: ${events.length}`);
    console.log(`   Events with Oct 25 (TODAY): ${todayEvents.length} ${todayEvents.length === 0 ? '✅' : '❌'}`);
    console.log(`   Real dates: ${events.length - todayEvents.length} ✅`);
    
    if (todayEvents.length > 0) {
      console.log('\n⚠️  FAKE "TODAY" EVENTS FOUND:');
      todayEvents.forEach(e => {
        console.log(`   - ${e.title}`);
      });
    } else {
      console.log('\n🎉 NO FAKE DATES! ALL EVENTS HAVE REAL DATES!');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

showAll();
